/**
 * Script kiểm tra kết nối MongoDB Atlas và AWS S3
 * Chạy: node src/tests/check-connections.js
 */
import mongoose from 'mongoose';
import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

const MONGO_URI = env.mongoUri;
const AWS_CONFIG = {
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey
  }
};
const BUCKET = env.aws.s3Bucket;

// ── Helpers ──
const ok = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg, err) => console.log(`  ❌ ${msg}: ${err.message || err}`);
const divider = () => console.log('─'.repeat(50));

// ── 1. Test MongoDB Atlas ──
async function testMongoDB() {
  console.log('\n🍃  MONGODB ATLAS');
  divider();

  // 1a. Kết nối
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    ok('Kết nối MongoDB Atlas thành công');
  } catch (err) {
    fail('Kết nối MongoDB Atlas thất bại', err);
    return false;
  }

  // 1b. Ping
  try {
    const admin = mongoose.connection.db.admin();
    const result = await admin.ping();
    if (result.ok === 1) ok('Ping database OK');
    else fail('Ping trả về lỗi', result);
  } catch (err) {
    fail('Ping thất bại', err);
  }

  // 1c. Liệt kê collections
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    ok(`Đọc được ${collections.length} collection(s): ${collections.map(c => c.name).join(', ') || '(trống)'}`);
  } catch (err) {
    fail('Liệt kê collections thất bại', err);
  }

  // 1d. Thử ghi/đọc/xóa document test
  try {
    const testCol = mongoose.connection.db.collection('_connection_test');
    const doc = { _test: true, timestamp: new Date() };
    await testCol.insertOne(doc);
    const found = await testCol.findOne({ _test: true });
    await testCol.deleteMany({ _test: true });
    if (found) ok('Ghi / Đọc / Xóa document test thành công');
    else fail('Không tìm thấy document vừa ghi', '');
  } catch (err) {
    fail('CRUD test thất bại', err);
  }

  await mongoose.disconnect();
  ok('Đã ngắt kết nối MongoDB');
  return true;
}

// ── 2. Test AWS S3 ──
async function testS3() {
  console.log('\n☁️   AWS S3');
  divider();

  const s3 = new S3Client(AWS_CONFIG);
  const testKey = '_connection_test.txt';
  const testBody = `VESD S3 test - ${new Date().toISOString()}`;

  // 2a. List buckets
  try {
    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    ok(`Xác thực AWS thành công – tìm thấy ${Buckets.length} bucket(s): ${Buckets.map(b => b.Name).join(', ')}`);
  } catch (err) {
    fail('Xác thực AWS thất bại (kiểm tra Access Key)', err);
    return false;
  }

  // 2b. Upload test file
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: testKey,
      Body: testBody,
      ContentType: 'text/plain'
    }));
    ok(`Upload file test lên s3://${BUCKET}/${testKey} thành công`);
  } catch (err) {
    fail(`Upload lên bucket "${BUCKET}" thất bại (kiểm tra bucket name + permissions)`, err);
    return false;
  }

  // 2c. Đọc lại file
  try {
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: testKey }));
    const content = await Body.transformToString();
    if (content === testBody) ok('Đọc file test từ S3 thành công – nội dung khớp');
    else fail('Nội dung file không khớp', `got "${content}"`);
  } catch (err) {
    fail('Đọc file từ S3 thất bại', err);
  }

  // 2d. Xóa file test
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: testKey }));
    ok('Xóa file test từ S3 thành công');
  } catch (err) {
    fail('Xóa file test thất bại', err);
  }

  ok('AWS S3 hoạt động bình thường');
  return true;
}

// ── Main ──
async function main() {
  console.log('\n🔍  KIỂM TRA KẾT NỐI VESD SERVER');
  console.log('═'.repeat(50));

  const mongoOk = await testMongoDB();
  const s3Ok = await testS3();

  console.log('\n' + '═'.repeat(50));
  console.log('📊  KẾT QUẢ:');
  console.log(`   MongoDB Atlas: ${mongoOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`   AWS S3:        ${s3Ok ? '✅ OK' : '❌ FAILED'}`);
  console.log('═'.repeat(50) + '\n');

  process.exit(mongoOk && s3Ok ? 0 : 1);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
