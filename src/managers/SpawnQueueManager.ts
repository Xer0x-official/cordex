import { maxWorkersForTarget, workersNeededForProject } from "../utilities/ManagementPlan";

export class SpawnQueueManager {
    public static recalculateSpawnPriorities(room: Room) {
        const spawn = Game.getObjectById(room.spawns[0])!;
        const colony = Memory.colonies[room.name];
        const resources = colony.resources.energy;

        // 1. Quellen finden und Distanzen berechnen
        let maxDistance = 0;
        for(const sourceId of Object.keys(resources)) {
            const resource = resources[sourceId as Id<Source>];
            const dist = resource.distance; // einfache Distanz
            if(dist > maxDistance) maxDistance = dist;
        }

        // 2. Sollwerte definieren
        const desired: { [name: string]: number } = {
            'miner': Object.keys(resources).length,
            'transporter': Object.keys(resources).length,
            'worker': SpawnQueueManager.neededWorkers(room),
        }
        if(maxDistance > 20) desired['transporter'] += 1;                         // zusätzlicher Carrier bei weiter Quelle:contentReference[oaicite:16]{index=16}

        // 4. Queue-Array vorbereiten
        const newQueue = [];
        const priorities: { [name: string]: number } = {
            'miner': 0,
            'transporter': 0,
            'worker': 0,
        }

        // 5. Spawn-Tasks erstellen basierend auf fehlenden Creeps
        for(const role in colony.stats.roles) {
            const needed = desired[role] - (colony.stats.roles[role] || 0);
            if(needed > 0) {
                // Priorität bestimmen:
                let priority = 0;
                switch(role) {
                    case 'miner':
                        priority = 100;
                        if(colony.stats.roles[role] === 0) priority = 300;  // absolut kritisch, keiner vorhanden
                        priorities[role] = (desired[role] - colony.stats.roles[role]) * priority;
                        break;
                    case 'transporter':
                        priority = 90;
                        if(colony.stats.roles[role] === 0) priority = 300
                        if(maxDistance > 20) priority += 10;    // weiter Weg -> etwas höher
                        priorities[role] = (desired[role] - colony.stats.roles[role]) * priority;
                        break;
                    case 'worker':
                        priority = 40;
                        priorities[role] = (desired[role] - colony.stats.roles[role]) * priority;
                        break;
                    case 'defender':
                        priority = 200; // bei Bedarf sehr hoch, aber Harvester-Notfall (300) bleibt höher
                        break;
                    default:
                        priority = 20;
                }
            }
        }

        // 7. Ins Memory schreiben
        colony.priorities = priorities; // oder separater Map für aktuelle Prioritäten pro Rolle
    }

    /** Ermittelt, welche (Bau-)Aufgabe Worker derzeit brauchen */
    private static neededWorkers(colony: Room): number {
        let count = 0;
        for (const project of colony.buildQueue) {
            if (project.cost && project.cost > 0) {
                // Prüfen, ob es sich um ein Controller‑Upgrade handelt
                const isControllerTask = /controller/i.test(project.name);
                // Wenn Logistik stark genug ist, nutze die maximal mögliche Anzahl Positionen
                let required: number;
                if (isControllerTask) {
                    const pos = project.structures[0].pos;
                    required = maxWorkersForTarget(pos, true /* isController */);
                } else {
                    // Bei normalen Projekten weiter wie gehabt
                    required = workersNeededForProject(project, colony);
                }

                const assigned =  SpawnQueueManager.countAlive('worker', project.name) + SpawnQueueManager.countQueued(colony, 'worker', project.name);
                const missing = Math.max(0, required - assigned);
                if (missing > 0) count += missing;
            }
        }
        return count;
    }

    /** Zählt lebende Creeps einer Rolle (optional mit task) */
    private static countAlive(role: string, task?: string): number {
        return _.filter(Game.creeps, c => c.memory.job === role && (!task || c.memory.task === task)).length;
    }

    /** Zählt Creeps einer Rolle in der SpawnQueue */
    private static countQueued(colony: Room, role: string, task?: string): number {
        return colony.spawnQueue.filter(e => e.memory?.job === role && (!task || e.memory.task === task)).length;
    }
}