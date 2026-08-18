import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GolfClub } from '../types';
import { REAL_CLUBS } from '../constants/clubs';
import { GripVertical, Plus, X } from 'lucide-react';

interface BagManagerProps {
    bag: GolfClub[];
    onAddClub: (club: GolfClub) => void;
    onRemoveClub: (club: GolfClub) => void;
    onMoveClub: (fromIndex: number, toIndex: number) => void;
}

interface SortableClubProps {
    club: GolfClub;
    onRemove: (club: GolfClub) => void;
}

const SortableClub: React.FC<SortableClubProps> = ({ club, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: club });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 p-2 rounded-lg theme-bg-tertiary ${isDragging ? 'opacity-50 z-10' : ''}`}
        >
            <button
                {...attributes}
                {...listeners}
                style={{ touchAction: 'none' }}
                className="p-1 rounded cursor-grab active:cursor-grabbing theme-text-tertiary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors select-none"
                title="Arrastrar para reordenar"
                aria-label={`Reordenar ${club}`}
            >
                <GripVertical size={16} />
            </button>
            <span className="text-sm font-bold theme-text-primary flex-1">{club}</span>
            <button
                onClick={() => onRemove(club)}
                className="p-1 rounded-full hover:bg-red-100 hover:text-red-600 theme-text-tertiary transition-colors"
                title="Eliminar"
                aria-label={`Eliminar ${club}`}
            >
                <X size={16} />
            </button>
        </div>
    );
};

export const BagManager: React.FC<BagManagerProps> = ({ bag, onAddClub, onRemoveClub, onMoveClub }) => {
    const [newClub, setNewClub] = useState('');
    const clubsInBag = new Set(bag);
    const availableClubs = REAL_CLUBS.filter((club) => !clubsInBag.has(club));

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            onMoveClub(bag.indexOf(String(active.id)), bag.indexOf(String(over.id)));
        }
    };

    const handleAddCustom = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = newClub.trim();
        if (trimmed.length === 0 || trimmed.toLowerCase() === 'lostball') return;
        onAddClub(trimmed);
        setNewClub('');
    };

    return (
        <div className="p-4 theme-card rounded-lg border-2 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider theme-text-secondary mb-3">
                Mi Bolsa
            </h3>

            {bag.length === 0 ? (
                <div className="text-xs theme-text-tertiary italic mb-3">
                    Tu bolsa está vacía. Agrega palos abajo.
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} autoScroll={false}>
                    <SortableContext items={bag} strategy={verticalListSortingStrategy}>
                        <div className="flex flex-col gap-2 mb-4">
                            {bag.map((club) => (
                                <SortableClub key={club} club={club} onRemove={onRemoveClub} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {availableClubs.length > 0 && (
                <>
                    <div className="text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
                        Agregar palo
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {availableClubs.map((club) => (
                            <button
                                key={club}
                                onClick={() => onAddClub(club)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border theme-border bg-white theme-text-primary text-sm font-bold hover:border-blue-300 active:scale-95 transition-all"
                                title={`Agregar ${club}`}
                            >
                                <Plus size={14} />
                                {club}
                            </button>
                        ))}
                    </div>
                </>
            )}

            <div className="mt-4 pt-3 border-t theme-border">
                <div className="text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
                    Agregar palo personalizado
                </div>
                <form onSubmit={handleAddCustom} className="flex gap-2">
                    <input
                        type="text"
                        value={newClub}
                        onChange={(e) => setNewClub(e.target.value)}
                        placeholder="Siglas del palo (ej. Hy, 5w, Dr)"
                        className="p-3 rounded-lg border theme-border theme-card theme-text-primary flex-1"
                    />
                    <button
                        type="submit"
                        disabled={newClub.trim().length === 0}
                        className="inline-flex items-center gap-1 px-4 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-40 active:scale-95 transition-all"
                    >
                        <Plus size={16} />
                        Agregar
                    </button>
                </form>
            </div>
        </div>
    );
};
