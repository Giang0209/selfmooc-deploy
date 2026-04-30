// socket-server.js
const { Server } = require("socket.io");

const io = new Server(3001, {
  cors: {
    origin: "http://localhost:3000", // URL của app Next.js của bạn
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("⚡ Có người vừa kết nối:", socket.id);

  // 1. Phân phòng chat để tin nhắn không bị "loạn" sang người khác
  socket.on("join_conversation", (convId) => {
    socket.join(convId);
    console.log(`👤 User ${socket.id} đã vào phòng: ${convId}`);
  });

  // 2. Nhận tin và phát đi cho người còn lại trong phòng
  socket.on("send_message", (data) => {
    const message = {
      conversation_id: data.conversationId,
      content: data.content,
      sender_id: String(data.sender_id),
      sender_role: String(data.senderRole),
      created_at: new Date().toISOString()
    };

    io.to(data.conversationId).emit("receive_message", message);
  });

  socket.on("disconnect", () => {
    console.log("🔥 Một người đã ngắt kết nối");
  });
});

console.log("🚀 Socket Server đang chạy tại port 3001...");