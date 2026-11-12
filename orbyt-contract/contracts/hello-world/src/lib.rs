#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,symbol_short ,token ,Address, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    InvalidInput = 2,
    NotInitialized = 3,
    NotOpen = 4,
    DeadlinePassed = 5,
    CircleFull = 6,
    AlreadyMember = 7,
    NotEnoughMembers = 8,
    InvalidOrder = 9,
    TooEarly = 10,
    NotActive = 11,
    NotMember = 12,
    CyclePaidUp = 13,
    CycleNotComplete = 14,
    NotCompleted = 15,
    NothingToClaim = 16,
    CycleEnded = 17,
    NotDueYet = 18,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum Status { Open, Active, Completed }

#[contracttype]
pub struct Circle {
    pub organizer: Address,
    pub token: Address,
    pub amount: i128,
    pub deposit: i128,
    pub max_members: u32,
    pub join_deadline: u64,
    pub contribution_interval :u64,
    pub contributions_per_payout :u32,
    pub current_cycle: u32,
    pub start_time :u64,
    pub status: Status,
}

#[contracttype]
pub enum DataKey {
    Circle,
    Members,
    Order,
    Paid(u32, Address),
    PaidCount(u32),
    Defaulted(Address),
    DepositLeft(Address),
}

#[contract]
pub struct OrbytCircle;

#[contractimpl]
impl OrbytCircle {
    pub fn init(
        env: Env,
        organizer: Address,
        token: Address,
        amount: i128,
        deposit: i128,
        max_members: u32,
        join_deadline: u64,
       contribution_interval :u64,
       contributions_per_payout :u32,
    ) -> Result<(), Error> {
        organizer.require_auth();

        if env.storage().instance().has(&DataKey::Circle) {
            return Err(Error::AlreadyInitialized);
        }
        if amount <= 0 || deposit < 0 || max_members < 2 || contribution_interval == 0 || contributions_per_payout ==0{
            return Err(Error::InvalidInput);
        }
        if join_deadline <= env.ledger().timestamp() {
            return Err(Error::InvalidInput);
        }

        let circle = Circle {
            organizer: organizer.clone(),
            token,
            amount,
            deposit,
            max_members,
            join_deadline,
            contribution_interval,
            contributions_per_payout,
            current_cycle: 0,
            start_time :0,
            status: Status::Open,
        };

        env.storage().instance().set(&DataKey::Circle, &circle);
        if circle.deposit > 0 {
            let client = token::Client::new(&env, &circle.token);
            client.transfer(&organizer, &env.current_contract_address(), &circle.deposit);
            env.storage()
                .persistent()
                .set(&DataKey::DepositLeft(organizer.clone()), &circle.deposit);
        }

        let mut members: Vec<Address> = Vec::new(&env);
        env.events().publish(
            (symbol_short!("created"), organizer.clone()),
            circle.amount,
        );
        members.push_back(organizer);
        env.storage().persistent().set(&DataKey::Members, &members);

        Ok(())
    }
    pub fn join(env: Env, member: Address) -> Result<(), Error> {
        member.require_auth();

        let circle: Circle = env
            .storage()
            .instance()
            .get(&DataKey::Circle)
            .ok_or(Error::NotInitialized)?;

        if circle.status != Status::Open {
            return Err(Error::NotOpen);
        }
        if env.ledger().timestamp() > circle.join_deadline {
            return Err(Error::DeadlinePassed);
        }

        let mut members: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Members)
            .unwrap_or_else(|| Vec::new(&env));

        if members.len() >= circle.max_members {
            return Err(Error::CircleFull);
        }
        if members.contains(&member) {
            return Err(Error::AlreadyMember);
        }

        if circle.deposit > 0 {
            let client = token::Client::new(&env, &circle.token);
            client.transfer(&member, &env.current_contract_address(), &circle.deposit);
            env.storage()
                .persistent()
                .set(&DataKey::DepositLeft(member.clone()), &circle.deposit);
        }
        env.events().publish(
            (symbol_short!("joined"), member.clone()),
            members.len() + 1,
        );
        members.push_back(member);
        env.storage().persistent().set(&DataKey::Members, &members);

        Ok(())
    }
    pub fn start(env: Env, order: Vec<Address>) -> Result<(), Error> {
        let mut circle: Circle = env
            .storage()
            .instance()
            .get(&DataKey::Circle)
            .ok_or(Error::NotInitialized)?;

        circle.organizer.require_auth();

        if circle.status != Status::Open {
            return Err(Error::NotOpen);
        }

        let members: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Members)
            .unwrap_or_else(|| Vec::new(&env));

        if members.len() < 2 {
            return Err(Error::NotEnoughMembers);
        }
        if env.ledger().timestamp() <= circle.join_deadline
            && members.len() < circle.max_members
        {
            return Err(Error::TooEarly);
        }
        if order.len() != members.len() {
            return Err(Error::InvalidOrder);
        }

        for m in members.iter() {
            let mut count: u32 = 0;
            for o in order.iter() {
                if o == m {
                    count += 1;
                }
            }
            if count != 1 {
                return Err(Error::InvalidOrder);
            }
        }

        env.storage().persistent().set(&DataKey::Order, &order);

        circle.status = Status::Active;
        circle.current_cycle = 1;
        circle.start_time = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::Circle, &circle);

        env.events().publish(
            (symbol_short!("started"), circle.current_cycle),
            members.len(),
        );

        Ok(())
    }

    pub fn contribute(env: Env, member: Address) -> Result<(), Error> {
        member.require_auth();

        let circle: Circle = env
            .storage()
            .instance()
            .get(&DataKey::Circle)
            .ok_or(Error::NotInitialized)?;

        if circle.status != Status::Active {
            return Err(Error::NotActive);
        }

        let members: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Members)
            .unwrap_or_else(|| Vec::new(&env));

        if !members.contains(&member) {
            return Err(Error::NotMember);
        }


        let paid_key = DataKey::Paid(circle.current_cycle, member.clone());
        let paid: u32 = env.storage().persistent().get(&paid_key).unwrap_or(0);

        if paid >= circle.contributions_per_payout {
            return Err(Error::CyclePaidUp);
        }
        let now: u64 = env.ledger().timestamp();
        let cycle_length: u64 =
            circle.contribution_interval * (circle.contributions_per_payout as u64);
        let cycle_start: u64 =
            circle.start_time + ((circle.current_cycle - 1) as u64) * cycle_length;
        let cycle_end: u64 = cycle_start + cycle_length;

        if now < cycle_start {
            return Err(Error::NotDueYet);
        }
        if now >= cycle_end {
            return Err(Error::CycleEnded);
        }

        let due_so_far: u32 = (((now - cycle_start) / circle.contribution_interval) as u32) + 1;
        if paid >= due_so_far {
            return Err(Error::NotDueYet);
        }

        let client = token::Client::new(&env, &circle.token);
        client.transfer(&member, &env.current_contract_address(), &circle.amount);

        env.storage().persistent().set(&paid_key, &(paid + 1));

        let count_key = DataKey::PaidCount(circle.current_cycle);
        let total: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        env.storage().persistent().set(&count_key, &(total + 1));
        env.events().publish(
            (symbol_short!("paid"), member.clone()),
            (circle.current_cycle, paid + 1),
        );
        if total + 1 >= members.len() * circle.contributions_per_payout {
            Self::payout(env.clone())?;
        }

        Ok(())
    }
    pub fn payout(env: Env) -> Result<(), Error> {
        let mut circle: Circle = env
            .storage()
            .instance()
            .get(&DataKey::Circle)
            .ok_or(Error::NotInitialized)?;

        if circle.status != Status::Active {
            return Err(Error::NotActive);
        }

        let members: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Members)
            .unwrap_or_else(|| Vec::new(&env));
        let order: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Order)
            .ok_or(Error::InvalidOrder)?;

        let needed: u32 = members.len() * circle.contributions_per_payout;
        let count_key = DataKey::PaidCount(circle.current_cycle);
        let total: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);

        let cycle_length: u64 =
            circle.contribution_interval * (circle.contributions_per_payout as u64);
        let cycle_end: u64 = circle.start_time + (circle.current_cycle as u64) * cycle_length;

        if total < needed && env.ledger().timestamp() < cycle_end {
            return Err(Error::CycleNotComplete);
        }

        let mut pot: i128 = (total as i128) * circle.amount;

        if total < needed {
            for m in members.iter() {
                let paid: u32 = env
                    .storage()
                    .persistent()
                    .get(&DataKey::Paid(circle.current_cycle, m.clone()))
                    .unwrap_or(0);
                let missing: u32 = circle.contributions_per_payout - paid;
                if missing > 0 {
                    let owed: i128 = (missing as i128) * circle.amount;
                    let left_key = DataKey::DepositLeft(m.clone());
                    let left: i128 = env.storage().persistent().get(&left_key).unwrap_or(0);
                    let cover: i128 = if left < owed { left } else { owed };
                    env.storage().persistent().set(&left_key, &(left - cover));
                    pot += cover;
                    env.storage()
                        .persistent()
                        .set(&DataKey::Defaulted(m.clone()), &true);
                        env.events().publish(
                        (symbol_short!("default"), circle.current_cycle),
                        (m.clone(), missing),
                    );
                }
            }
        }

        let recipient: Address = order
            .get(circle.current_cycle - 1)
            .ok_or(Error::InvalidOrder)?;

        if pot > 0 {
            let client = token::Client::new(&env, &circle.token);
            client.transfer(&env.current_contract_address(), &recipient, &pot);
        }
        env.events().publish(
            (symbol_short!("payout"), circle.current_cycle),
            (recipient.clone(), pot),
        );

        if circle.current_cycle >= members.len() {
            circle.status = Status::Completed;
        } else {
            circle.current_cycle += 1;
        }
        env.storage().instance().set(&DataKey::Circle, &circle);

        Ok(())
    }

    pub fn claim_deposit(env: Env, member: Address) -> Result<(), Error> {
        member.require_auth();

        let circle: Circle = env
            .storage()
            .instance()
            .get(&DataKey::Circle)
            .ok_or(Error::NotInitialized)?;

        if circle.status != Status::Completed {
            return Err(Error::NotCompleted);
        }

        let left_key = DataKey::DepositLeft(member.clone());
        let left: i128 = env.storage().persistent().get(&left_key).unwrap_or(0);

        if left <= 0 {
            return Err(Error::NothingToClaim);
        }

        env.storage().persistent().set(&left_key, &0i128);

        let client = token::Client::new(&env, &circle.token);
        client.transfer(&env.current_contract_address(), &member, &left);
        env.events().publish((symbol_short!("claimed"), member.clone()), left);

        Ok(())
    }

    pub fn get_circle(env: Env) -> Result<Circle, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Circle)
            .ok_or(Error::NotInitialized)
    }

    pub fn get_members(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Members)
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_order(env: Env) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Order)
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_paid(env: Env, cycle: u32, member: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Paid(cycle, member))
            .unwrap_or(0)
    }
}

 mod test; 