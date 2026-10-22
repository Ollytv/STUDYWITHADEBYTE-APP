import { onRequestOptions as __api_ai_chat_ts_onRequestOptions } from "C:\\Users\\User\\studywithadebyte-v2\\studywithadebyte\\functions\\api\\ai-chat.ts"
import { onRequestPost as __api_ai_chat_ts_onRequestPost } from "C:\\Users\\User\\studywithadebyte-v2\\studywithadebyte\\functions\\api\\ai-chat.ts"
import { onRequestGet as __api_news_ts_onRequestGet } from "C:\\Users\\User\\studywithadebyte-v2\\studywithadebyte\\functions\\api\\news.ts"
import { onRequestOptions as __api_news_ts_onRequestOptions } from "C:\\Users\\User\\studywithadebyte-v2\\studywithadebyte\\functions\\api\\news.ts"
import { onRequest as __api_news_ts_onRequest } from "C:\\Users\\User\\studywithadebyte-v2\\studywithadebyte\\functions\\api\\news.ts"

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
  {
      routePath: "/api/news",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_news_ts_onRequestGet],
    },
  {
      routePath: "/api/news",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_news_ts_onRequestOptions],
    },
  {
      routePath: "/api/news",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_news_ts_onRequest],
    },
  ]