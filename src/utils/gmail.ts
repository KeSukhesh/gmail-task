// import type { gmail_v1 } from "googleapis";
// import { api } from "~/trpc/react";

// export function useGmailMessages(label?: string) {
//   const labelIds = label ? [label] : undefined;

//   const { data: listResponse } = api.gmail.listMessages.useQuery({
//     labelIds,
//     maxResults: 20,
//   });

//   const messages = listResponse?.messages ?? [];

//   const messageDetails = messages.map((msg) => {
//     const { data } = api.gmail.getMessage.useQuery({
//       messageId: msg.id,
//       format: "full",
//     });
//     return data;
//   });

//   return {
//     data: messageDetails.filter(
//       (msg): msg is gmail_v1.Schema$Message => msg !== undefined,
//     ),
//     isLoading: false,
//   };
// }
