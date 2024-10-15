import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2';
import { RowDataPacket } from 'mysql2';

const app = express();
app.use(cors());
app.use(express.json());


const db = mysql.createConnection({
    host: 'localhost', 
    user: 'root',  
    password: '',      
    database: 'mini_project' 
  });
  

// ตั้งค่าการอัพโหลดรูปภาพ
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.use('/uploads', express.static('uploads'));
// สมัครสมาชิก
app.post('/register', upload.single('profileImage'), (req: Request, res: Response) => {
    const { username, password, age, gender } = req.body;
    const profileImage = req.file?.filename || '';
  
    const hashedPassword = bcrypt.hashSync(password, 8);
    const sql = 'INSERT INTO users (username, password, age, gender, profile_image) VALUES (?, ?, ?, ?, ?)';
  
    db.query(sql, [username, hashedPassword, age, gender, profileImage], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      return res.json({ success: true, message: 'User registered' });
    });
  });

// เข้าสู่ระบบ
app.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
  
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], (err, results: RowDataPacket[]) => {  // กำหนด results เป็น RowDataPacket[]
      if (err || results.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid username' });
      }
  
      const user = results[0] as RowDataPacket;  // กำหนดชนิดของ user ให้ถูกต้อง
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ success: false, message: 'Invalid password' });
      }
  
      const token = jwt.sign({ id: user.id }, 'secret_key', { expiresIn: '1h' });
      return res.json({ success: true, token });
    });
  });

  // บันทึกค่าใช้จ่าย
  app.post('/api/expenses', upload.single('image'), (req: Request, res: Response) => {
    const { user_id, title, amount, category, date, visibility } = req.body;
    const image = req.file?.filename || '';
  
    const sql = 'INSERT INTO expenses (user_id, title, amount, category, date, image, visibility) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [user_id, title, amount, category, date, image, visibility], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      return res.json({ success: true, message: 'Expense added' });
    });
  });
  
  // ดึงข้อมูลค่าใช้จ่าย
  app.get('/api/expenses', (req: Request, res: Response) => {
    const user_id = req.query.user_id;
    console.log('Fetching expenses for user_id:', user_id);
    
    const sql = 'SELECT * FROM expenses WHERE user_id = ?';
    db.query(sql, [user_id], (err, results: RowDataPacket[]) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      return res.json({ success: true, expenses: results });
    });
  });

  // ลบข้อมูลค่าใช้จ่าย
app.delete('/api/expenses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const sql = 'DELETE FROM expenses WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    return res.json({ success: true, message: 'Expense deleted' });
  });
});

// แก้ไขข้อมูลค่าใช้จ่าย
app.put('/api/expenses/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, amount, category, date, visibility } = req.body; // ดึง visibility มาจาก request body
  const sql = 'UPDATE expenses SET title = ?, amount = ?, category = ?, date = ?, visibility = ? WHERE id = ?';
  db.query(sql, [title, amount, category, date, visibility, id], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });
    return res.json({ success: true, message: 'Expense updated' });
  });
});
  
//ดึงข้อมูล Public
app.get('/api/public-expenses', (req: Request, res: Response) => {
  const sql = 'SELECT * FROM expenses WHERE visibility = "public"';
  db.query(sql, (err, results: RowDataPacket[]) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    return res.json({ success: true, expenses: results });
  });
});


  
  

app.listen(5000, () => console.log('Server running on port 5000'));
