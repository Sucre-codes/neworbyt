import { useEffect, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LoaderCircle, Play } from "lucide-react";
import Modal from "./Modal.jsx";
import { api, ENDPOINTS } from "../lib/api.js";
import { primary } from "../lib/ui.js";

function Row({ item, index }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.userId });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-3 rounded-xl border bg-bg px-3 py-2.5 ${isDragging ? "relative z-10 border-accent shadow-lg" : "border-line"}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent">{index + 1}</span>
      <span className="flex-1 font-semibold">{item.name}</span>
      <button type="button" {...attributes} {...listeners} aria-label={`Move ${item.name}`} className="grid h-10 w-10 cursor-grab touch-none place-items-center rounded-lg text-muted transition hover:text-ink active:cursor-grabbing">
        <GripVertical size={18} />
      </button>
    </li>
  );
}

export default function OrderModal({ circleId, onClose, onStarted }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    api(`${ENDPOINTS.circles}/${circleId}/suggested-order`).then(setItems).catch((e) => setError(e.message));
  }, [circleId]);

  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    setItems((list) => arrayMove(list, list.findIndex((i) => i.userId === active.id), list.findIndex((i) => i.userId === over.id)));
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await api(`${ENDPOINTS.circles}/${circleId}/start`, { method: "POST", body: { order: items.map((i) => i.userId) } });
      onStarted();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Set the payout order" onClose={onClose}>
      <p className="mb-4 text-sm text-muted">Position 1 collects first. Drag members to move them, for example to match when someone needs the money. This is locked once you confirm.</p>
      {!items ? (
        <p className="text-sm text-muted">{error || "Loading members…"}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.userId)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2">{items.map((item, i) => <Row key={item.userId} item={item} index={i} />)}</ol>
          </SortableContext>
        </DndContext>
      )}
      {error && items && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button onClick={confirm} disabled={!items || busy} className={`${primary} mt-6 w-full`}>
        {busy ? <><LoaderCircle size={18} className="animate-spin" /> Starting circle…</> : <><Play size={18} /> Confirm order and start</>}
      </button>
    </Modal>
  );
}
