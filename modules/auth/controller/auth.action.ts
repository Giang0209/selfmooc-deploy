'use server';
import { cookies } from 'next/headers'; // Import thư viện quản lý Cookie của Next.js
import { authenticateUser } from '../services/auth.service';
import { loginSchema } from '../models/auth.model';
import { signToken } from '../utils/auth.util'; // Import hàm tạo token vừa viết
import { registerUser } from '../services/auth.service';
import { registerSchema } from '../models/auth.model';
export async function loginAction(formData: unknown) {
  try {
    // 1. KIỂM TRA TẠI CỬA (Zod Validation)
    const validatedFields = loginSchema.safeParse(formData);

    // Nếu dữ liệu rác/sai định dạng -> Đá ra ngay, không gọi DB
    if (!validatedFields.success) {
      // Lấy lỗi đầu tiên để báo cho người dùng
      const errorMessage = validatedFields.error.issues[0].message;
      return { success: false, message: errorMessage };
    }

    // 2. Dữ liệu đã sạch 100%, lấy ra xài
    const cleanData = validatedFields.data;

    // 3. GỌI DATABASE (Service)
    const user = await authenticateUser(cleanData);

    if (!user) {
      return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
    }
    // 4. TẠO JWT VÀ LƯU VÀO COOKIES
    const token = await signToken(user);
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true, // Bảo mật: Trình duyệt (JS) không thể đọc được cookie này
      secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS trên production
      sameSite: 'lax', // Bảo vệ khỏi lỗi CSRF
      maxAge: 7 * 24 * 60 * 60, // Sống trong 7 ngày (tính bằng giây)
      path: '/', // Cookie có hiệu lực trên toàn website
    });

    return { 
      success: true, 
      message: 'Đăng nhập thành công!', 
      data: user 
    };

  } catch (error) {
    console.error('Lỗi Server Action Login:', error);
    return { success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau.' };
  }
}

export async function registerAction(formData: unknown) {
  try {
    // 1. Kiểm tra tại cửa bằng Zod
    const validatedFields = registerSchema.safeParse(formData);

    if (!validatedFields.success) {
      const errorMessage = validatedFields.error.issues[0].message;
      return { success: false, message: errorMessage };
    }

    const cleanData = validatedFields.data;

    // 2. Gọi DB để tạo tài khoản
    const newUser = await registerUser(cleanData);

    // 3. Tự động đăng nhập luôn sau khi đăng ký thành công
    const token = await signToken(newUser);
    
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return { 
      success: true, 
      message: 'Đăng ký tài khoản thành công!', 
      data: newUser 
    };

  } catch (error: any) {
    // Trả về lỗi nếu trùng email hoặc lỗi DB
    return { success: false, message: error.message || 'Lỗi hệ thống' };
  }
}

// Đăng xuất
export async function logoutAction() {
  // Gọi bác bảo vệ quản lý Cookie ra
  const cookieStore = await cookies();
  
  // Lệnh cho bác ấy HỦY cái thẻ 'session' đi
  cookieStore.delete('session');
  
  return { success: true, message: 'Đã đăng xuất thành công' };
}