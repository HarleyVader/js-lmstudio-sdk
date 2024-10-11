export function messageRouter(io) {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('message', (data) => {
      console.log('Message received:', data);
      // Handle the message
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
}