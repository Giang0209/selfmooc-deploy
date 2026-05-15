'use server'
import { sendChatMessageService, getMessageHistoryService, startConversationService } from '../services/chat.service';

export async function getChatDetailsAction(tId: number, pId: number, sId: number) {
  try {
    const convId = await startConversationService(tId, pId, sId);
    const history = await getMessageHistoryService(convId);
    return { success: true, convId, history };
  } catch (e: any) {
    console.error("Action Error (GetDetails):", e.message);
    return { success: false, error: e.message };
  }
}

export async function sendMessageAction(data: any) {
  try {
    const res = await sendChatMessageService(data);
    return { success: true, message: res };
  } catch (e: any) {
    console.error("Action Error (Send):", e.message);
    return { success: false, error: e.message };
  }
}

import { getTeacherChatListService, getParentChatListService } from '../services/chat.service';

export async function getContactNameAction(role: string, userId: number, contactId: number) {
  try {
    const list =
      role === 'teacher'
        ? await getTeacherChatListService(userId)
        : await getParentChatListService(userId);

    const found = list.find((x: any) => Number(x.contact_id) === Number(contactId));

    return {
      success: true,
      name: found?.contact_name || 'Unknown'
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}