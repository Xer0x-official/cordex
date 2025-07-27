// src/logistics/TransportManager.ts
import UUID from "pure-uuid";
import { max } from "lodash";

declare global {
    interface Memory {
        transportRequests?: TransportRequest[];
    }
}

export class TransportManager {
    /** Anfragen in Memory initialisieren */
    private static ensureMemory() {
        if (!Memory.transportRequests) Memory.transportRequests = [];
    }

    /**
     * Sammle alle Anfragen in einem Raum.
     * Diese Methode durchsucht Miningspots, Container, DroppedEnergy usw. und
     * erzeugt pro Quelle und Ziel eine Anfrage.
     */
    public static collectRequests(room: Room) {
        this.ensureMemory();
        const requests: TransportRequest[] = [];
        const dests: Id<Structure<StructureConstant> | AnyCreep>[] = []

        for (let coloniesKey in Memory.colonies) {
            let colonie = Game.rooms[coloniesKey];
            if (colonie) {
                const findEnergyDestinations = this.findEnergyDestinations(colonie);
                findEnergyDestinations.forEach(destination => {
                    dests.push(destination);
                });
            }
        }

        // 1. Dropped Energy und Tombstones als Quellen
        const dropped = room.find(FIND_DROPPED_RESOURCES, {
            filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 100
        });

        // for (const res of dropped) {
        //     const dests = this.findEnergyDestinations(room);
        //     if (dests.length > 0) {
        //         requests.push({
        //             id: new UUID(4).format(),
        //             originId: res.id,
        //             possibleDestinations: dests,
        //             amount: res.amount,
        //             priority: 1
        //         });
        //     }
        // }

        // beim Sammeln von Dropped Energy
        for (const res of dropped) {
            const existing = Memory.transportRequests!.find(r => r.originId === res.id);
            if (existing) {
                existing.amount = res.amount;
                existing.possibleDestinations = dests;
            } else if (dests.length > 0) {
                requests.push({
                    id: new UUID(4).format(),
                    originId: res.id,
                    possibleDestinations: dests,
                    amount: res.amount,
                    priority: 1
                });
            }
        }

        // 2. Container/Links mit Energieüberschuss
        const containers = room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE || s.structureType === STRUCTURE_LINK) &&
                (s as StructureStorage).store.getUsedCapacity(RESOURCE_ENERGY) > (s.structureType === STRUCTURE_LINK ? 0 : 200)
        }) as (StructureStorage | StructureLink)[];

        for (const cont of containers) {
            const amount = cont.store.getUsedCapacity(RESOURCE_ENERGY);
            const existing = Memory.transportRequests!.find(r => r.originId === cont.id);
            if (existing) {
                existing.amount = amount;
                existing.possibleDestinations = dests;
            } else if (amount > 0 && dests.length > 0) {
                requests.push({
                    id: new UUID(4).format(),
                    originId: cont.id,
                    possibleDestinations: dests,
                    amount,
                    priority: 2
                });
            }
        }

        // 3. Strukturen/Creeps mit Energiebedarf (für „mobile Container“)
        //    Diese Anfragen sind reine „dropoff“-Ziele und werden bei assignTasks ausgewertet.

        // console.log(`dropped: ${dropped} -> requests:` + requests.length);

        // Liste bereinigen und aktualisieren
        Memory.transportRequests = Memory.transportRequests!.filter(req => {
            const originObj = Game.getObjectById(req.originId);
            // Request löschen, wenn Quelle nicht mehr existiert oder keine Energie mehr hat
            if (!originObj) return false;
            if (originObj instanceof Resource) return originObj.amount > 0;
            if ('store' in originObj) return originObj.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
            return true;
        }).concat(requests).sort((a, b) => {
            const objA = Game.getObjectById(a.originId);
            const objB = Game.getObjectById(b.originId);
            if (!objA || !objB) return 0;

            // 1. Typ-Priorität: Resource (=1) vor Struktur (=2)
            // if (a.priority !== b.priority) {
            //     return a.priority - b.priority;
            // }

            // 2. Innerhalb derselben Gruppe: Sortierung nach Menge (desc)
            const getAmt = (o: Resource<ResourceConstant> | StructureWithStorage) =>
                o instanceof Resource
                    ? o.amount
                    : o.store.getUsedCapacity(RESOURCE_ENERGY);

            return getAmt(objB) - getAmt(objA);
        });

        // Aktualisiere Memory
        // Memory.transportRequests = Memory.transportRequests!.filter(
        //     r => Game.getObjectById(r.originId) != null && r.amount > 0
        // ).concat(requests);
    }

    /** Finde Strukturen und Creeps im Raum, die Energie benötigen */
    private static findEnergyDestinations(room: Room): Id<Structure | AnyCreep>[] {
        const targets: (Structure | AnyCreep)[] = [];

        // Extensions/Spawns/Towers nachfüllen
        targets.push(
            ...room.find(FIND_STRUCTURES, {
                filter: s => {
                    if ('store' in s) {
                        const free = s.store.getFreeCapacity(RESOURCE_ENERGY);
                        if (s.structureType === STRUCTURE_TOWER) {
                            return free > s.store.getCapacity(RESOURCE_ENERGY) * 0.5;
                        }
                        return free > 0;
                    }
                    return false;
                }
            })
        );

        // Arbeiter (Worker‑Creeps), die Energie brauchen
        targets.push(
            ...room.find(FIND_MY_CREEPS, {
                filter: c => c.memory.job === 'worker' && c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            })
        );

        return targets.map(t => t.id as Id<Structure | AnyCreep>);
    }

    /** Liefert eine Task für einen Transporter aus dessen Memory */
    public static getTaskForCreep(creep: Creep): TransportTask | null {
        return creep.memory.transportTask ?? null;
    }

    /**
     * Verteile die offenen Anfragen auf die angegebenen Transporter.
     * Hier wird der Gale‑Shapley‑Algorithmus verwendet.
     */
    public static assignTasks(creeps: Creep[]) {
        this.ensureMemory();
        const requests = Memory.transportRequests!;
        if (requests.length === 0 || creeps.length === 0) return;

        const assignedAmount: number[][] = Array(requests.length)
            .fill(0)
            .map(() => Array(creeps.length).fill(0));

        // Anzahl maximaler Carrier pro Quelle, z.B. aus Memory.settings
        // const maxCarriers = Memory.settings?.transporterPerSource ?? 3;

        // Tracke pro Anfrage, wie viele Carrier bereits zugewiesen wurden
        // const assignmentsCount = new Array(requests.length).fill(0);

        // Kapazität jedes Carriers ermitteln
        const creepCapacities = creeps.map(c => c.store.getFreeCapacity());

        // Kostentabelle erstellen: cost[r][c] = Distanzkosten
        const costs: number[][] = [];
        const reqPref: number[][] = [];  // pro Request sortierte Creepliste
        const creepPref: number[][] = []; // pro Creep sortierte Requestliste

        // Berechne Kostenmatrix
        for (let i = 0; i < requests.length; i++) {
            const req = requests[i];
            costs[i] = [];
            for (let j = 0; j < creeps.length; j++) {
                const creep = creeps[j];
                const originObj = Game.getObjectById(req.originId)!;
                // Nearest destination heuristisch: Distanz von Quelle zu Ziel schätzen
                const destPos = Game.getObjectById(req.possibleDestinations[0])?.pos ?? originObj.pos;
                // const cost =
                //     creep.pos.getRangeTo(originObj.pos) +
                //     originObj.pos.getRangeTo(destPos) +
                //     ((req.priority - 1) * 100);

                const originRoom = originObj.pos.roomName;
                const destRoom = creep.room.name; // Carrier startet meist im Hauptraum
                const roomDistance = Game.map.getRoomLinearDistance(originRoom, destRoom);

                // Beispiel: jeder Raum Abstand zählt als 50 Felder
                const interRoomPenalty = roomDistance * 25;
                const rangeToSource = creep.pos.getRangeTo(originObj.pos) % 50;
                const rangeToTarget = originObj.pos.getRangeTo(destPos) % 50;

                costs[i][j] = Math.max(1, (rangeToSource + rangeToTarget + interRoomPenalty));
            }
        }

        // Erzeuge Präferenzlisten: niedrigere Kosten = bessere Präferenz
        for (let i = 0; i < requests.length; i++) {
            reqPref[i] = _.range(creeps.length).sort((a, b) => costs[i][a] - costs[i][b]);
        }
        for (let j = 0; j < creeps.length; j++) {
            creepPref[j] = _.range(requests.length).sort((a, b) => costs[a][j] - costs[b][j]);
        }

        // Gale‑Shapley‑Matching: Requests machen Angebote
        const reqRemaining = requests.map(r => r.amount);
        const proposals = Array(requests.length).fill(0);
        const matches: (number | null)[] = Array(creeps.length).fill(null);
        const freeRequests = new Set<number>(_.range(requests.length));

        // Matching-Schleife
        while (freeRequests.size > 0) {
            const rIdx = freeRequests.values().next().value as number;

            // Wenn die Obergrenze erreicht ist, diese Anfrage in diesem Tick nicht mehr bedienen
            // if (assignmentsCount[rIdx] >= maxCarriers) {
            //     freeRequests.delete(rIdx);
            //     continue;
            // }

            if (proposals[rIdx] >= creeps.length) {
                freeRequests.delete(rIdx);
                continue;
            }

            const cIdx = reqPref[rIdx][proposals[rIdx]];
            proposals[rIdx]++;

            const currentMatch = matches[cIdx];
            const capacity = creepCapacities[cIdx];
            const assignable = Math.min(reqRemaining[rIdx], capacity);

            if (currentMatch === null) {
                matches[cIdx] = rIdx;
                assignedAmount[rIdx][cIdx] = assignable;
                reqRemaining[rIdx] -= assignable;
                // assignmentsCount[rIdx]++;

                if (reqRemaining[rIdx] <= 0) {
                    freeRequests.delete(rIdx);
                }
            } else {
                const better = creepPref[cIdx].indexOf(rIdx) < creepPref[cIdx].indexOf(currentMatch);
                if (better) {
                    // alte Zuordnung zurücknehmen
                    reqRemaining[currentMatch] += assignedAmount[currentMatch][cIdx];
                    assignedAmount[currentMatch][cIdx] = 0;
                    // assignmentsCount[currentMatch]--;
                    freeRequests.add(currentMatch);

                    // neue Zuordnung
                    matches[cIdx] = rIdx;
                    assignedAmount[rIdx][cIdx] = assignable;
                    reqRemaining[rIdx] -= assignable;
                    // assignmentsCount[rIdx]++;
                    if (reqRemaining[rIdx] <= 0) {
                        freeRequests.delete(rIdx);
                    } else {
                        freeRequests.add(rIdx);
                    }
                }
            }
        }

        // Beim Schreiben in den Creep-Memory
        for (let cIdx = 0; cIdx < matches.length; cIdx++) {
            const rIdx = matches[cIdx];
            if (rIdx === null) continue;

            const creep = creeps[cIdx];
            const req = requests[rIdx];

            // Prioritäten definieren; kleinere Zahl = höhere Priorität
            const targetPriority: Record<string, number> = {
                [STRUCTURE_SPAWN]: 0,
                [STRUCTURE_EXTENSION]: 1,
                [STRUCTURE_TOWER]: 2,
                creep: 3,                 // Worker creeps
                [STRUCTURE_CONTAINER]: 4,
                [STRUCTURE_LINK]: 4,      // optional wie Container behandeln
                [STRUCTURE_STORAGE]: 5,
                [STRUCTURE_TERMINAL]: 6,
            };

            // … innerhalb der for-Schleife beim Zuweisen:
            const targetId = req.possibleDestinations.filter(target => {
                if (req.originId === target) {
                    return false;
                }

                // let originObject = Game.getObjectById(req.originId);
                // let targetObject = Game.getObjectById(target);
                //
                // if (!originObject || !targetObject) return false;
                // if (originObject instanceof Structure && targetObject instanceof Structure) {
                //     let originStructure = targetObject as Structure;
                //     let targetStructure = targetObject as Structure;
                //     return originStructure.structureType !== targetStructure.structureType;
                // }
                return true;
            }).sort((a, b) => {
                const objA = Game.getObjectById(a);
                const objB = Game.getObjectById(b);

                // Strukturtyp bestimmen (creeps behandeln separat)
                const typeA =
                    objA instanceof Structure ? objA.structureType :
                        objA instanceof Creep ? 'creep' : undefined;
                const typeB =
                    objB instanceof Structure ? objB.structureType :
                        objB instanceof Creep ? 'creep' : undefined;

                // Zuerst nach Priorität sortieren
                const prioA = typeA !== undefined && targetPriority[typeA] !== undefined ? targetPriority[typeA] : 99;
                const prioB = typeB !== undefined && targetPriority[typeB] !== undefined ? targetPriority[typeB] : 99;
                if (prioA !== prioB) {
                    return prioA - prioB;
                }

                // Bei gleicher Priorität nach Distanz sortieren
                const distA = objA ? objA.pos.getRangeTo(creep.pos) : 100;
                const distB = objB ? objB.pos.getRangeTo(creep.pos) : 100;
                return distA - distB;
            })[0];

            const amount = assignedAmount[rIdx][cIdx]; // exakt die zugewiesene Menge
            creep.memory.transportTask = {
                requestId: req.id,
                originId: req.originId,
                targetId,
                amount
            } as TransportTask;
        }

        // Aktualisiere req.amount aus reqRemaining
        for (let i = 0; i < requests.length; i++) {
            requests[i].amount = reqRemaining[i];
        }

        // Lösche erledigte Anfragen
        Memory.transportRequests = requests.filter((_, i) => reqRemaining[i] > 0);
    }

    // public static assignTasks(creeps: Creep[]) {
    //     this.ensureMemory();
    //     const requests = Memory.transportRequests!;
    //     if (requests.length === 0 || creeps.length === 0) return;
    //
    //     // Kapazität jedes Carriers ermitteln
    //     const creepCapacities = creeps.map(c => c.store.getFreeCapacity());
    //
    //     // Kostenmatrix wie gehabt
    //     const costs: number[][] = [];
    //     const reqPref: number[][] = [];
    //     const creepPref: number[][] = [];
    //
    //     for (let i = 0; i < requests.length; i++) {
    //         costs[i] = [];
    //         const req = requests[i];
    //         for (let j = 0; j < creeps.length; j++) {
    //             const creep = creeps[j];
    //             const originObj = Game.getObjectById(req.originId)!;
    //             const destPos = Game.getObjectById(req.possibleDestinations[0])?.pos ?? originObj.pos;
    //             const cost = creep.pos.getRangeTo(originObj.pos) + originObj.pos.getRangeTo(destPos);
    //             costs[i][j] = cost;
    //         }
    //     }
    //     for (let i = 0; i < requests.length; i++) {
    //         reqPref[i] = _.range(creeps.length).sort((a, b) => costs[i][a] - costs[i][b]);
    //     }
    //     for (let j = 0; j < creeps.length; j++) {
    //         creepPref[j] = _.range(requests.length).sort((a, b) => costs[a][j] - costs[b][j]);
    //     }
    //
    //     // Verbleibende Menge pro Request
    //     const reqRemaining = requests.map(r => r.amount);
    //     const proposals = Array(requests.length).fill(0);
    //     const matches: (number | null)[] = Array(creeps.length).fill(null);
    //     const freeRequests = new Set<number>(_.range(requests.length));
    //
    //     while (freeRequests.size > 0) {
    //         // Nimm die erste freie Anfrage
    //         const iter = freeRequests.values().next();
    //         const rIdx = iter.value as number;
    //         const req = requests[rIdx];
    //
    //         // Wenn die Anfrage alle Carrier durch hat, streichen
    //         if (proposals[rIdx] >= creeps.length) {
    //             freeRequests.delete(rIdx);
    //             continue;
    //         }
    //
    //         // Wähle den nächsten bevorzugten Carrier
    //         const cIdx = reqPref[rIdx][proposals[rIdx]];
    //         proposals[rIdx]++;
    //
    //         const currentMatch = matches[cIdx];
    //         if (currentMatch === null) {
    //             // Carrier ist noch frei -> zuweisen
    //             matches[cIdx] = rIdx;
    //
    //             // Ziehe die Kapazität des Carriers von der Restmenge ab
    //             reqRemaining[rIdx] -= creepCapacities[cIdx];
    //             if (reqRemaining[rIdx] <= 0) {
    //                 // Anfrage ist vollständig gedeckt -> aus dem freien Set entfernen
    //                 freeRequests.delete(rIdx);
    //             }
    //         } else {
    //             // Carrier ist bereits belegt -> prüfe, ob er diese Anfrage lieber mag
    //             const prefersNew = creepPref[cIdx].indexOf(rIdx) < creepPref[cIdx].indexOf(currentMatch);
    //             if (prefersNew) {
    //                 // Bisherige Anfrage zurück in die freie Liste
    //                 reqRemaining[currentMatch] += creepCapacities[cIdx]; // Rückgängig machen
    //                 freeRequests.add(currentMatch);
    //                 // Neue Anfrage zuweisen
    //                 matches[cIdx] = rIdx;
    //                 reqRemaining[rIdx] -= creepCapacities[cIdx];
    //                 if (reqRemaining[rIdx] <= 0) {
    //                     freeRequests.delete(rIdx);
    //                 } else {
    //                     freeRequests.add(rIdx);
    //                 }
    //                 freeRequests.delete(currentMatch);
    //             }
    //             // Falls der Carrier beim alten Request bleibt, probiert die neue Anfrage nächste Carrier aus.
    //         }
    //     }
    //
    //     // Weise die Creeps ihren jeweiligen Aufgaben zu
    //     for (let cIdx = 0; cIdx < matches.length; cIdx++) {
    //         const rIdx = matches[cIdx];
    //         if (rIdx === null) continue;
    //
    //         const creep = creeps[cIdx];
    //         const req = requests[rIdx];
    //
    //         // Prioritäten definieren; kleinere Zahl = höhere Priorität
    //         const targetPriority: Record<string, number> = {
    //             [STRUCTURE_SPAWN]: 0,
    //             [STRUCTURE_EXTENSION]: 1,
    //             [STRUCTURE_TOWER]: 2,
    //             creep: 3,                 // Worker creeps
    //             [STRUCTURE_CONTAINER]: 4,
    //             [STRUCTURE_LINK]: 4,      // optional wie Container behandeln
    //             [STRUCTURE_STORAGE]: 5,
    //             [STRUCTURE_TERMINAL]: 6,
    //         };
    //
    //         // … innerhalb der for-Schleife beim Zuweisen:
    //         const targetId = req.possibleDestinations.sort((a, b) => {
    //             const objA = Game.getObjectById(a);
    //             const objB = Game.getObjectById(b);
    //
    //             // Strukturtyp bestimmen (creeps behandeln separat)
    //             const typeA =
    //                 objA instanceof Structure ? objA.structureType :
    //                     objA instanceof Creep ? 'creep' : undefined;
    //             const typeB =
    //                 objB instanceof Structure ? objB.structureType :
    //                     objB instanceof Creep ? 'creep' : undefined;
    //
    //             // Zuerst nach Priorität sortieren
    //             const prioA = typeA !== undefined && targetPriority[typeA] !== undefined ? targetPriority[typeA] : 99;
    //             const prioB = typeB !== undefined && targetPriority[typeB] !== undefined ? targetPriority[typeB] : 99;
    //             if (prioA !== prioB) {
    //                 return prioA - prioB;
    //             }
    //
    //             // Bei gleicher Priorität nach Distanz sortieren
    //             const distA = objA ? objA.pos.getRangeTo(creep.pos) : 100;
    //             const distB = objB ? objB.pos.getRangeTo(creep.pos) : 100;
    //             return distA - distB;
    //         })[0];
    //
    //         const amount = Math.min(creepCapacities[cIdx], req.amount);
    //         creep.memory.transportTask = {
    //             requestId: req.id,
    //             originId: req.originId,
    //             targetId,
    //             amount
    //         } as TransportTask;
    //
    //         // Reduziere auch req.amount (für zukünftige Ticks)
    //         req.amount -= amount;
    //     }
    //
    //     // Entferne erledigte Anfragen
    //     Memory.transportRequests = requests.filter((r, i) => reqRemaining[i] > 0);
    // }

}
