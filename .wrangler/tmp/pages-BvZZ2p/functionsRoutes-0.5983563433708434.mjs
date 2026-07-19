import { onRequestOptions as __api_ai_chat_ts_onRequestOptions } from "C:\\Users\\User\\studywithadebyte-v2\\studywithadebyte\\functions\\api\\ai-chat.ts"
import { onRequestPost as __api_ai_chat_ts_onRequestPost } from "C:\\Users\\User\\studywithadebyte-v2\\studywithadebyte\\functions\\api\\ai-chat.ts"

export const routes = [
    {
      routePath: "/api/ai-chat",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_ai_chat_ts_onRequestOptions],
    },
  {
      routePath: "/api/ai-chat",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_ai_chat_ts_onRequestPost],
    },
  ]