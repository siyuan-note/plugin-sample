import type {openTab} from "siyuan";

// 为 siyuan 1.2.7 补充与 petal 一致的类型，升级到包含这些接口的 SDK 后可使用其内置声明。
export type FlashcardReviewOptions = Parameters<typeof openTab>[0] & {
    card: {
        reviewSetIDs?: string[];
        reviewMode?: "normal" | "reinforcement";
        query?: {
            version: number;
            root: {
                operator: "matchAll" | "and" | "or" | "not" | "predicate";
                children?: FlashcardReviewOptions["card"]["query"]["root"][];
                field?: string;
                comparator?: string;
                value?: unknown;
            };
        };
    };
};
