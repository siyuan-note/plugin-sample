import "siyuan";

declare module "siyuan" {
    // 为 siyuan 1.2.7 补充与 petal 一致的声明，升级到包含这些方法的 SDK 后可删除此文件。
    interface Plugin {
        loadPublishData(): Promise<Record<string, string | number | boolean | null>>;
        savePublishData(data: Record<string, string | number | boolean | null>): Promise<void>;
    }
}
