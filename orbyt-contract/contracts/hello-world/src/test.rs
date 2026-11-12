#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, vec, Address, Env,
};

fn setup<'a>(env: &Env) -> (OrbytCircleClient<'a>, Address, Address, Address, Address) {
    env.mock_all_auths();

    let contract_id = env.register(OrbytCircle, ());
    let client = OrbytCircleClient::new(env, &contract_id);

    let issuer = Address::generate(env);
    let token_addr = env.register_stellar_asset_contract_v2(issuer).address();
    let minter = token::StellarAssetClient::new(env, &token_addr);

    let organizer = Address::generate(env);
    let a = Address::generate(env);
    let b = Address::generate(env);

    minter.mint(&organizer, &10_000);
    minter.mint(&a, &10_000);
    minter.mint(&b, &10_000);

    (client, token_addr, organizer, a, b)
}

#[test]
fn organizer_is_first_member_and_deposits_are_locked() {
    let env = Env::default();
    let (client, token_addr, organizer, a, b) = setup(&env);

    env.ledger().set_timestamp(1_000);
    client.init(&organizer, &token_addr, &100, &50, &4, &2_000, &60, &3);

    assert_eq!(client.get_members().len(), 1);

    client.join(&a);
    client.join(&b);
    assert_eq!(client.get_members().len(), 3);

    let t = token::Client::new(&env, &token_addr);
    assert_eq!(t.balance(&organizer), 9_950);
    assert_eq!(t.balance(&a), 9_950);
    assert_eq!(t.balance(&client.address), 150);

    assert_eq!(client.try_join(&a), Err(Ok(Error::AlreadyMember)));
}

#[test]
fn full_ajo_two_members_two_cycles() {
    let env = Env::default();
    let (client, token_addr, organizer, a, _b) = setup(&env);
    let t = token::Client::new(&env, &token_addr);

    env.ledger().set_timestamp(1_000);
    client.init(&organizer, &token_addr, &100, &50, &2, &2_000, &60, &2);
    client.join(&a);
    client.start(&vec![&env, a.clone(), organizer.clone()]);

    // Cycle 1, period 1
    client.contribute(&organizer);
    client.contribute(&a);
    assert_eq!(client.try_contribute(&organizer), Err(Ok(Error::NotDueYet)));

    // Cycle 1, period 2: the last payment triggers the payout to a
    env.ledger().set_timestamp(1_060);
    client.contribute(&organizer);
    client.contribute(&a);
    assert_eq!(t.balance(&a), 10_150);
    assert_eq!(t.balance(&organizer), 9_750);
    assert_eq!(client.get_circle().current_cycle, 2);
    assert_eq!(client.try_contribute(&a), Err(Ok(Error::NotDueYet)));

    // Cycle 2
    env.ledger().set_timestamp(1_120);
    client.contribute(&organizer);
    client.contribute(&a);
    env.ledger().set_timestamp(1_180);
    client.contribute(&organizer);
    client.contribute(&a);

    assert!(client.get_circle().status == Status::Completed);
    assert_eq!(t.balance(&organizer), 9_950);
    assert_eq!(t.balance(&a), 9_950);

    // Deposits come back
    client.claim_deposit(&organizer);
    client.claim_deposit(&a);
    assert_eq!(t.balance(&organizer), 10_000);
    assert_eq!(t.balance(&a), 10_000);
    assert_eq!(t.balance(&client.address), 0);
}

#[test]
fn defaulter_is_covered_by_deposit_and_cycle_moves_on() {
    let env = Env::default();
    let (client, token_addr, organizer, a, _b) = setup(&env);
    let t = token::Client::new(&env, &token_addr);

    env.ledger().set_timestamp(1_000);
    client.init(&organizer, &token_addr, &100, &100, &2, &2_000, &60, &2);
    client.join(&a);
    client.start(&vec![&env, a.clone(), organizer.clone()]);

    // Period 1: both pay
    client.contribute(&organizer);
    client.contribute(&a);

    // Period 2: only the organizer pays, a goes quiet
    env.ledger().set_timestamp(1_060);
    client.contribute(&organizer);

    // Not complete and not over yet, so payout is refused
    assert_eq!(client.try_payout(), Err(Ok(Error::CycleNotComplete)));

    // The cycle ends at 1,120: late payments are refused
    env.ledger().set_timestamp(1_120);
    assert_eq!(client.try_contribute(&a), Err(Ok(Error::CycleEnded)));

    // Anyone can now settle the cycle
    client.payout();

    // a is paid the full pot, with the missing contribution covered by a's own deposit
    assert_eq!(t.balance(&a), 10_200);
    assert_eq!(t.balance(&organizer), 9_700);
    assert_eq!(t.balance(&client.address), 100);
    assert_eq!(client.get_circle().current_cycle, 2);

    // a is flagged as a defaulter, the organizer is not
    let flagged = env.as_contract(&client.address, || {
        env.storage()
            .persistent()
            .get::<DataKey, bool>(&DataKey::Defaulted(a.clone()))
    });
    assert_eq!(flagged, Some(true));

    let clean = env.as_contract(&client.address, || {
        env.storage()
            .persistent()
            .get::<DataKey, bool>(&DataKey::Defaulted(organizer.clone()))
    });
    assert_eq!(clean, None);
}

#[test]
fn rules_are_enforced() {
    let env = Env::default();
    let (client, token_addr, organizer, a, b) = setup(&env);

    env.ledger().set_timestamp(1_000);

    // Bad settings are refused
    assert_eq!(
        client.try_init(&organizer, &token_addr, &0, &50, &3, &2_000, &60, &2),
        Err(Ok(Error::InvalidInput))
    );

    client.init(&organizer, &token_addr, &100, &50, &3, &2_000, &60, &2);

    // The same circle can't be created twice
    assert_eq!(
        client.try_init(&organizer, &token_addr, &100, &50, &3, &2_000, &60, &2),
        Err(Ok(Error::AlreadyInitialized))
    );

    // Nothing works before the circle starts
    assert_eq!(client.try_contribute(&organizer), Err(Ok(Error::NotActive)));
    assert_eq!(client.try_payout(), Err(Ok(Error::NotActive)));

    client.join(&a);

    // Can't start early while joining is open and the circle isn't full
    let good_order = vec![&env, a.clone(), organizer.clone()];
    assert_eq!(client.try_start(&good_order), Err(Ok(Error::TooEarly)));

    // After the deadline, nobody new can join
    env.ledger().set_timestamp(2_001);
    assert_eq!(client.try_join(&b), Err(Ok(Error::DeadlinePassed)));

    // Bad payout orders are refused
    let duplicate = vec![&env, organizer.clone(), organizer.clone()];
    assert_eq!(client.try_start(&duplicate), Err(Ok(Error::InvalidOrder)));
    let too_short = vec![&env, a.clone()];
    assert_eq!(client.try_start(&too_short), Err(Ok(Error::InvalidOrder)));
    let with_stranger = vec![&env, a.clone(), b.clone()];
    assert_eq!(client.try_start(&with_stranger), Err(Ok(Error::InvalidOrder)));

    client.start(&good_order);

    // A stranger can't pay into the pot
    assert_eq!(client.try_contribute(&b), Err(Ok(Error::NotMember)));

    // Deposits stay locked until the circle is over
    assert_eq!(
        client.try_claim_deposit(&organizer),
        Err(Ok(Error::NotCompleted))
    );
}