import * as ProfileUtilities from "../utilities/Profiles";
import * as OrdersRepository from "../repository/Orders";
import * as Upgrader from "../roles/Upgrader";
import { CreepService } from "../services/Creep";
import { RoomService } from "../services/Room";
import { Order } from "../classes/Order";
import { Role } from "../enums/role";
import { Priority } from "../enums/priority";
import { Manager, ManagerPriority } from "./_Manager";

export class UpgradeManager extends Manager {
    private roomService: RoomService;
    private creepService: CreepService;

    readonly MEMORY_LASTRUN = "lastRun";

    constructor(roomService: RoomService, creepService: CreepService) {
        super("UpgradeManager");
        this.roomService = roomService;
        this.creepService = creepService;
    }

    run(pri: ManagerPriority) {
        if (pri === ManagerPriority.Low) {
            this.creepService.runCreeps(Role.Upgrader, Upgrader.run);

            const lastRun = this.getValue(this.MEMORY_LASTRUN);
            if (lastRun === undefined || lastRun + 20 < Game.time) {
                const rooms = this.roomService.getNormalRooms();
                this.organizeControllerUpgrading(rooms);
                this.setValue(this.MEMORY_LASTRUN, Game.time);
            }
        }
    }

    private organizeControllerUpgrading(rooms: Room[]) {
        for (const room of rooms) {
            if (room.controller === undefined) {
                continue;
            }
            this.orderUpgrader(room.controller);
        }
    }

    private orderUpgrader(controller: StructureController) {
        const room = controller.room;
        const active = this.creepService.getCreeps(Role.Upgrader, controller.id).length;
        const ordered = OrdersRepository.getCreepsInQueue(controller.room, Role.Upgrader, controller.id);

        if (active + ordered === 0) {
            const order = new Order();
            const maxTier = ProfileUtilities.getMaxTierHeavyWorker(room.energyCapacityAvailable);
            order.body = ProfileUtilities.getHeavyWorkerBody(maxTier);
            order.priority = Priority.Standard;
            order.memory = {
                role: Role.Upgrader,
                target: controller.id,
                tier: maxTier
            };
            OrdersRepository.orderCreep(controller.room, order);
        }
    }
}
