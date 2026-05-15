'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  sendMessageAction,
  getChatDetailsAction,
  getContactNameAction,
} from '@/modules/chats/controller/chat.action';
import { useUser } from '../user-provider';
import { useParams } from 'next/navigation';

interface ChatParams {
  contactId: string;
}

export default function DetailChatPage() {
  const user = useUser();
  const params = useParams();
  const contactId = params.contactId;

  const [contactName, setContactName] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // =========================
  // GET IDS (FIXED LOGIC)
  // =========================
  const getIds = () => {
    const meId = Number(user?.id);
    const otherId = Number(contactId);

    if (user?.role === 'teacher') {
      return { tId: meId, pId: otherId, meId };
    } else {
      return { tId: otherId, pId: meId, meId };
    }
  };

  // =========================
  // INIT CHAT
  // =========================
  useEffect(() => {
    if (!user || !contactId) return;

    const initChat = async () => {
      const { tId, pId } = getIds();

      const res = await getChatDetailsAction(tId, pId, 1);

      if (res.success) {
        setCurrentConvId(res.convId ?? null);
        setMessages(res.history ?? []);
      }

      const nameRes = await getContactNameAction(
        user.role,
        Number(user.id),
        Number(contactId)
      );

      if (nameRes.success) {
        setContactName(nameRes.name);
      }
    };

    initChat();
  }, [contactId, user]);

  // =========================
  // SOCKET
  // =========================
  useEffect(() => {
    if (!currentConvId) return;

    socketRef.current = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    socketRef.current.emit('join_conversation', currentConvId);

    const handler = (data: any) => {
      setMessages((prev) => [...prev, data]);
    };

    socketRef.current.on('receive_message', handler);

    return () => {
      socketRef.current?.off('receive_message', handler);
      socketRef.current?.disconnect();
    };
  }, [currentConvId]);

  // =========================
  // AUTO SCROLL
  // =========================
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // =========================
  // SEND MESSAGE
  // =========================
  const handleSend = async () => {
    if (!input.trim() || !currentConvId || !user) return;

    const { tId, pId, meId } = getIds();

    const payload = {
      tId,
      pId,
      sId: 1,
      content: input,
      senderRole: user.role,
      conversationId: currentConvId,
      sender_id: meId,
      created_at: new Date().toISOString(),
    };

    try {
      socketRef.current?.emit('send_message', payload);
      await sendMessageAction(payload);
      setInput('');
    } catch (err) {
      console.error('Gửi tin nhắn thất bại:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-inherit">
      {/* HEADER */}
      <div className="p-5 border-b-2 border-emerald-50 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center">
          👤
        </div>
        <h3 className="text-lg font-black">
          {contactName || 'Trao đổi trực tiếp'}
        </h3>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.map((m, index) => (
          <div
            key={index}
            className={`flex ${Number(m.sender_id) === Number(user?.id)
              ? 'justify-end'
              : 'justify-start'
              }`}
          >
            <div
              className={`max-w-[70%] p-4 rounded-3xl text-sm font-bold ${Number(m.sender_id) === Number(user?.id)
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-gray-700 border'
                }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Nhập tin nhắn..."
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button
            onClick={handleSend}
            className="bg-emerald-500 text-white px-4 py-2 rounded-lg"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}