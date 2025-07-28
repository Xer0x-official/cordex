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
            if(resource.active && dist > maxDistance) maxDistance = dist;
        }

        // 2. Sollwerte definieren
        const desired: { [name: string]: number } = {
            'miner': Math.max(colony.stats.activeResources, 1),
            'transporter': Math.max(colony.stats.roles.miner * Memory.settings.transporterPerSource, 1),
            'worker': SpawnQueueManager.neededWorkers(room),
        }

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
                        priority = SpawnQueueManager.getMinerPriority(colony, resources);
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

    private static getMinerPriority(colony: IColonieMemory, resources: { [p: Id<Source>]: ISourceMemory }): number {
        if (colony.stats.roles.miner === 0) {
            return 300;  // absolut kritisch: kein einziger Miner vorhanden
        } else {
            // Alle fehlenden Miner ermitteln (Quellen ohne zugewiesenen Miner)
            const missingMinerSources = Object.values(resources)
                .filter(res => !res.miner);  // res.miner ist null => kein Miner aktiv

            if (missingMinerSources.length > 0) {
                // Prüfen, ob alle fehlenden Miner-Quellen in anderen Räumen liegen
                const allRemote = missingMinerSources.every(res => {
                    // Bestimme den Raum der Quelle (per Pfad oder Position)
                    let sourceRoom = colony.base;
                    if (res.resourcePath.path && res.resourcePath.path.length > 0) {
                        const lastPos = res.resourcePath.path[res.resourcePath.path.length - 1];
                        sourceRoom = lastPos.roomName;
                    } else if (res.pos) {
                        sourceRoom = res.pos.roomName;
                    }
                    return sourceRoom !== colony.base;  // true, wenn Quelle in anderem Raum
                });

                if (allRemote) {
                    // Wenn **alle** ausstehenden Miner für Remote-Quellen sind:
                    return 60;  // Priorität absenken (Transporter werden ggf. wichtiger)
                } else {
                    // Optional: Falls keine Remote-Only-Situation, aber manche Quelle sehr weit weg ist
                    // (im selben Raum), könnte man hier eine moderate Absenkung erwägen.
                    const farThreshold = 20;
                    const anyFarLocal = missingMinerSources.some(res => {
                        // ähnliche Raum-Bestimmung wie oben
                        let distance = res.distance;
                        if (distance === undefined && res.resourcePath.path) {
                            distance = res.resourcePath.path.length; // evtl. Pfadlänge als Distanz nutzen
                        }
                        // Quelle im selben Raum und Distanz > Threshold?
                        let sameRoom = true;
                        if (res.resourcePath.path && res.resourcePath.path.length > 0) {
                            sameRoom = res.resourcePath.path[res.resourcePath.path.length - 1].roomName === colony.base;
                        }
                        return sameRoom && distance && distance > farThreshold;
                    });
                    if (anyFarLocal) {
                        // Leichte Absenkung bei sehr weiter entfernter lokaler Quelle
                        return 80;
                    }
                }
            }
        }
        return 100;
    }
}