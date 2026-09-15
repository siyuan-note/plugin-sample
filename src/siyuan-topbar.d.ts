import type {IEventBusMap} from "siyuan";

// 为 siyuan 1.2.7 补充与 petal 一致的顶栏选项，SDK 更新后可移除此声明。
declare module "siyuan" {
    interface Plugin {
        addTopBar(options: {
            id?: string;
            icon?: string;
            element?: HTMLElement;
            title: string;
            callback?: (event: MouseEvent) => void;
            position?: "right" | "left";
            contextMenu?: (menu: IEventBusMap["open-menu-blockref"]["menu"]) => void;
        }): HTMLElement;
    }
}
