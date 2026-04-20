import { SignJWT, jwtVerify } from 'jose';
import { AuthUser } from '../models/auth.model';

// Đọc mã bí mật từ file .env
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);

// Hàm 1: Tạo Token (Mã hóa thông tin user thành 1 chuỗi dài)
export async function signToken(payload: AuthUser): Promise<string> {
  return await new SignJWT({ ...payload }) // Nhét thông tin user vào token
    .setProtectedHeader({ alg: 'HS256' })  // Thuật toán mã hóa
    .setIssuedAt()                         // Thời gian tạo
    .setExpirationTime('7d')               // Token sống được 7 ngày
    .sign(secretKey);                      // Ký tên bằng chìa khóa bí mật
}

// Hàm 2: Giải mã Token (Dùng để kiểm tra xem user là ai ở các Request sau)
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as AuthUser;
  } catch (error) {
    console.error('Token không hợp lệ hoặc đã hết hạn');
    return null;
  }
}