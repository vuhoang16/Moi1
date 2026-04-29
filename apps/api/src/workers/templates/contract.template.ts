import * as dayjs from 'dayjs';

interface ContractData {
  id: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  depositAmount: number;
  paymentDueDay: number;
  electricityStartReading: number;
  waterStartReading: number;
  terms: string;
  landlord: { fullName: string; phone: string; email: string };
  tenant: { fullName: string; phone: string; email: string };
  room: {
    roomNumber: string;
    area: number;
    floor?: number;
    property: {
      name: string;
      address: string;
      ward: string;
      district: string;
      city: string;
      electricityRate: number;
      waterRate: number;
    };
  };
}

interface SignatureUrls {
  landlordSignatureUrl?: string;
  tenantSignatureUrl?: string;
}

export function contractTemplate(contract: ContractData, signatures?: SignatureUrls): string {
  const fmt = (d: Date) => dayjs(d).format('DD/MM/YYYY');
  const money = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Times New Roman", serif; font-size: 13pt; color: #000; padding: 40px 60px; }
    h1 { text-align: center; font-size: 18pt; text-transform: uppercase; margin-bottom: 6px; }
    .subtitle { text-align: center; font-size: 12pt; margin-bottom: 24px; }
    h2 { font-size: 13pt; margin: 20px 0 8px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    td { padding: 4px 8px; vertical-align: top; }
    td:first-child { width: 45%; font-weight: bold; }
    .terms { white-space: pre-wrap; line-height: 1.6; }
    .sign-row { display: flex; justify-content: space-between; margin-top: 60px; }
    .sign-box { text-align: center; width: 45%; }
    .sign-box img { height: 80px; margin-bottom: 8px; }
    .sign-line { border-top: 1px solid #000; margin-top: 60px; }
    .footer { text-align: center; margin-top: 40px; font-size: 10pt; color: #666; }
  </style>
</head>
<body>
  <h1>Hợp Đồng Thuê Phòng</h1>
  <p class="subtitle">Số hợp đồng: ${contract.id.slice(0, 8).toUpperCase()}</p>

  <h2>I. Thông Tin Các Bên</h2>
  <table>
    <tr><td>Bên cho thuê (Chủ nhà):</td><td>${contract.landlord.fullName}</td></tr>
    <tr><td>Điện thoại chủ nhà:</td><td>${contract.landlord.phone}</td></tr>
    <tr><td>Email chủ nhà:</td><td>${contract.landlord.email}</td></tr>
    <tr><td>Bên thuê (Người thuê):</td><td>${contract.tenant.fullName}</td></tr>
    <tr><td>Điện thoại người thuê:</td><td>${contract.tenant.phone}</td></tr>
    <tr><td>Email người thuê:</td><td>${contract.tenant.email}</td></tr>
  </table>

  <h2>II. Thông Tin Phòng</h2>
  <table>
    <tr><td>Toà nhà:</td><td>${contract.room.property.name}</td></tr>
    <tr><td>Địa chỉ:</td><td>${contract.room.property.address}, ${contract.room.property.ward}, ${contract.room.property.district}, ${contract.room.property.city}</td></tr>
    <tr><td>Số phòng:</td><td>${contract.room.roomNumber}${contract.room.floor != null ? ` (Tầng ${contract.room.floor})` : ''}</td></tr>
    <tr><td>Diện tích:</td><td>${contract.room.area} m²</td></tr>
  </table>

  <h2>III. Điều Khoản Tài Chính</h2>
  <table>
    <tr><td>Tiền thuê hàng tháng:</td><td>${money(contract.monthlyRent)}</td></tr>
    <tr><td>Tiền đặt cọc:</td><td>${money(contract.depositAmount)}</td></tr>
    <tr><td>Ngày thanh toán hàng tháng:</td><td>Ngày ${contract.paymentDueDay} hàng tháng</td></tr>
    <tr><td>Giá điện:</td><td>${money(contract.room.property.electricityRate)}/kWh</td></tr>
    <tr><td>Giá nước:</td><td>${money(contract.room.property.waterRate)}/m³</td></tr>
    <tr><td>Chỉ số điện bàn giao:</td><td>${contract.electricityStartReading} kWh</td></tr>
    <tr><td>Chỉ số nước bàn giao:</td><td>${contract.waterStartReading} m³</td></tr>
  </table>

  <h2>IV. Thời Hạn Hợp Đồng</h2>
  <table>
    <tr><td>Từ ngày:</td><td>${fmt(contract.startDate)}</td></tr>
    <tr><td>Đến ngày:</td><td>${fmt(contract.endDate)}</td></tr>
  </table>

  <h2>V. Điều Khoản Chung</h2>
  <div class="terms">${contract.terms}</div>

  <div class="sign-row">
    <div class="sign-box">
      <strong>Chủ Nhà</strong>
      ${signatures?.landlordSignatureUrl ? `<br/><img src="${signatures.landlordSignatureUrl}" alt="Chữ ký chủ nhà"/>` : '<div class="sign-line"></div>'}
      <p>${contract.landlord.fullName}</p>
    </div>
    <div class="sign-box">
      <strong>Người Thuê</strong>
      ${signatures?.tenantSignatureUrl ? `<br/><img src="${signatures.tenantSignatureUrl}" alt="Chữ ký người thuê"/>` : '<div class="sign-line"></div>'}
      <p>${contract.tenant.fullName}</p>
    </div>
  </div>

  <p class="footer">Hợp đồng được tạo tự động bởi App Quản Lý Cho Thuê Nhà — ${fmt(new Date())}</p>
</body>
</html>`;
}
