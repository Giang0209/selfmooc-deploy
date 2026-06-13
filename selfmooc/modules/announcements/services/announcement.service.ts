import {
  checkTeacherClassDB,
  createAnnouncementMongo,
  getEnrolledStudentsDB,
  createNotificationsMongo,
  getAnnouncementsByClassMongo,
  getParentsByClassDB
} from '../models/announcement.model';

export async function createClassAnnouncementService(
  teacherId: number,
  classId: number,
  data: { title: string; body: string; attachments?: any[]; is_pinned?: boolean }
) {
  // 1. Kiểm tra giáo viên có quản lý lớp này không
  const isAuthorized = await checkTeacherClassDB(teacherId, classId);
  if (!isAuthorized) {
    throw new Error('❌ Bạn không có quyền gửi thông báo cho lớp học này!');
  }

  // 2. Lưu nội dung thông báo vào Mongo
  const announcementId = await createAnnouncementMongo({
    pg_class_id: classId,
    pg_teacher_id: teacherId,
    title: data.title,
    body: data.body,
    attachments: data.attachments || [],
    is_pinned: data.is_pinned || false,
  });

  // 3. Lấy danh sách học sinh đang active trong lớp
  const studentIds = await getEnrolledStudentsDB(classId);
  // Lấy danh sách phụ huynh của các học sinh trong lớp
  const parentIds = await getParentsByClassDB(classId);

  // 4. Chuẩn bị dữ liệu Notification cho học sinh và phụ huynh
  const notifications: any[] = [];

  // Thêm thông báo cho học sinh
  studentIds.forEach(studentId => {
    notifications.push({
      recipient_id: studentId,
      recipient_type: 'student',
      type: 'class_announcement',
      title: `Thông báo mới từ lớp học: ${data.title}`,
      body: data.body.substring(0, 100) + '...', 
      payload: { announcement_id: announcementId, class_id: classId },
      channels: {
        in_app: { sent: true, read_at: null }
      },
      is_read: false,
      created_at: new Date(),
    });
  });

  // Thêm thông báo cho phụ huynh tương ứng
  parentIds.forEach(parentId => {
    notifications.push({
      recipient_id: parentId,
      recipient_type: 'parent',
      type: 'class_announcement',
      title: `Cô nhắc nhở lớp của con: ${data.title}`,
      body: data.body.substring(0, 100) + '...', 
      payload: { announcement_id: announcementId, class_id: classId },
      channels: {
        in_app: { sent: true, read_at: null }
      },
      is_read: false,
      created_at: new Date(),
    });
  });

  // 5. Gửi Notification hàng loạt
  await createNotificationsMongo(notifications);

  return announcementId;
}

export async function getClassAnnouncementsService(classId: number) {
  return await getAnnouncementsByClassMongo(classId);
}