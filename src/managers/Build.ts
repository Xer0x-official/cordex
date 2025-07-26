import * as ProfileUtilities from "../utilities/Profiles";
import * as OrdersRepository from "../repository/Orders";
import * as Builder from "../roles/Builder";
import { CreepService } from "../services/Creep";
import { RoomService } from "../services/Room";
import { Order } from "../classes/Order";
import { Role } from "../enums/role";
import { Priority } from "../enums/priority";
import { Manager, ManagerPriority } from "./_Manager";

export class BuildManager extends Manager {
    private roomService: RoomService;
    private creepService: CreepService;

    readonly MEMORY_LASTRUN = "lastRun";

    constructor(roomService: RoomService, creepService: CreepService) {
        super("BuildManager");
        this.roomService = roomService;
        this.creepService = creepService;
    }

    public run(pri: ManagerPriority) {
        if (pri === ManagerPriority.Low) {
            this.creepService.runCreeps(Role.Builder, Builder.run);

            const lastRun = this.getValue(this.MEMORY_LASTRUN);
            if (lastRun === undefined || lastRun + 20 < Game.time) {
                const rooms = this.roomService.getNormalRooms();
                this.organizeStructureBuilding(rooms);
                this.setValue(this.MEMORY_LASTRUN, Game.time);
            }
        }
    }

    private organizeStructureBuilding(rooms: Room[]) {
        for (const room of rooms) {
            this.orderBuilder(room);
        }
    }

    private orderBuilder(room: Room) {
        const active = this.creepService.getCreeps(Role.Builder).length;
        const ordered = OrdersRepository.getCreepsInQueue(room, Role.Builder);

        if (active + ordered === 0) {
            const order = new Order();
            const maxTier = ProfileUtilities.getMaxTierSimpleWorker(room.energyCapacityAvailable);
            order.body = ProfileUtilities.getSimpleWorkerBody(maxTier);
            order.priority = Priority.Standard;
            order.memory = {
                role: Role.Builder,
                tier: maxTier
            };
            OrdersRepository.orderCreep(room, order);
        }
    }
}
