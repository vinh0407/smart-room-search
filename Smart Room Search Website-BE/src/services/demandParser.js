/**
 * Demand Parser Service - AI Room Search Demand Analyzer
 * Phân tích văn bản tiếng Việt tự nhiên thành dữ liệu nhu cầu có cấu trúc.
 * Tuân thủ quy tắc: không bịa thông tin, trích xuất chính xác khoảng giá, diện tích,
 * tiện ích, địa điểm ưu tiên, khoảng cách, và yêu cầu đặc biệt.
 */

const DISTRICT_LOOKUP = [
  { match: /\b(?:q\.?1|quận 1|quan 1)\b/i, name: 'Quận 1' },
  { match: /\b(?:q\.?2|quận 2|quan 2)\b/i, name: 'Quận 2' },
  { match: /\b(?:q\.?3|quận 3|quan 3)\b/i, name: 'Quận 3' },
  { match: /\b(?:q\.?4|quận 4|quan 4)\b/i, name: 'Quận 4' },
  { match: /\b(?:q\.?5|quận 5|quan 5)\b/i, name: 'Quận 5' },
  { match: /\b(?:q\.?6|quận 6|quan 6)\b/i, name: 'Quận 6' },
  { match: /\b(?:q\.?7|quận 7|quan 7)\b/i, name: 'Quận 7' },
  { match: /\b(?:q\.?8|quận 8|quan 8)\b/i, name: 'Quận 8' },
  { match: /\b(?:q\.?9|quận 9|quan 9)\b/i, name: 'Quận 9' },
  { match: /\b(?:q\.?10|quận 10|quan 10)\b/i, name: 'Quận 10' },
  { match: /\b(?:q\.?11|quận 11|quan 11)\b/i, name: 'Quận 11' },
  { match: /\b(?:q\.?12|quận 12|quan 12)\b/i, name: 'Quận 12' },
  { match: /\b(?:bình thạnh|binh thanh|q\.?\s*bt)\b/i, name: 'Bình Thạnh' },
  { match: /\b(?:gò vấp|go vap|q\.?\s*gv)\b/i, name: 'Gò Vấp' },
  { match: /\b(?:tân bình|tan binh|q\.?\s*tb)\b/i, name: 'Tân Bình' },
  { match: /\b(?:tân phú|tan phu|q\.?\s*tp)\b/i, name: 'Tân Phú' },
  { match: /\b(?:phú nhuận|phu nhuan|q\.?\s*pn)\b/i, name: 'Phú Nhuận' },
  { match: /\b(?:thủ đức|thu duc|tp thủ đức)\b/i, name: 'Thủ Đức' },
  { match: /\b(?:bình tân|binh tan)\b/i, name: 'Bình Tân' },
  { match: /\b(?:hóc môn|hoc mon)\b/i, name: 'Hóc Môn' },
  { match: /\b(?:nhà bè|nha be)\b/i, name: 'Nhà Bè' },
  { match: /\b(?:bình chánh|binh chanh)\b/i, name: 'Bình Chánh' },
  { match: /\b(?:củ chi|cu chi)\b/i, name: 'Củ Chi' },
  { match: /\b(?:cần giờ|can gio)\b/i, name: 'Cần Giờ' },
];

function extractDistrict(text) {
  for (const item of DISTRICT_LOOKUP) {
    if (item.match.test(text)) {
      return item.name;
    }
  }
  return null;
}

function extractRoomType(text) {
  const lower = text.toLowerCase();
  if (/\b(?:căn hộ dịch vụ|chdv)\b/i.test(lower)) return 'Căn hộ dịch vụ';
  if (/\b(?:căn hộ mini|chmn|chung cư mini)\b/i.test(lower)) return 'Căn hộ mini';
  if (/\b(?:căn hộ|chung cư)\b/i.test(lower)) return 'Căn hộ';
  if (/\b(?:nhà nguyên căn|nhà riêng)\b/i.test(lower)) return 'Nhà nguyên căn';
  if (/\b(?:ở ghép|ký túc xá|ktx|sleepbox|box)\b/i.test(lower)) return 'Ở ghép / KTX';
  if (/\b(?:phòng trọ|nhà trọ|phòng|trọ)\b/i.test(lower)) return 'Phòng trọ';
  if (/\b(?:văn phòng|mặt bằng|mặt tiền)\b/i.test(lower)) return 'Văn phòng / Mặt bằng';
  return null;
}

function parseMoneyUnit(valStr, unitStr) {
  let val = parseFloat(valStr.replace(',', '.'));
  if (isNaN(val)) return null;
  const u = (unitStr || '').toLowerCase();
  if (u.includes('củ') || u.includes('triệu') || u.includes('trieu') || u.includes('tr') || u === 'm') {
    return Math.round(val * 1000000);
  }
  if (u.includes('k') || u.includes('nghìn') || u.includes('ngan')) {
    return Math.round(val * 1000);
  }
  if (val < 100) {
    return Math.round(val * 1000000);
  }
  return Math.round(val);
}

function extractPriceRange(text) {
  let min_price = null;
  let max_price = null;
  // Bỏ qua cụm từ "quận X" / "qX" để không nhận nhầm số quận thành số tiền
  const s = text.toLowerCase().replace(/\b(?:quận|quan|q\.?)\s*\d{1,2}\b/gi, '');

  // 1) Dạng khoảng: "3-4 triệu", "3 đến 4tr", "3tr - 4tr5", "3 - 4 củ", "3tr5-4tr"
  const rangeMatch = s.match(
    /(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|củ|k)?\s*(?:-|–|—|đến|to|\.\.\.)\s*(\d+(?:[.,]\d+)?)\s*(triệu|trieu|tr|củ|cu|k|nghìn|ngan|m)(?:\s|$|[,;.!?])/i
  );
  if (rangeMatch) {
    const unit = rangeMatch[3] || 'triệu';
    min_price = parseMoneyUnit(rangeMatch[1], unit);
    max_price = parseMoneyUnit(rangeMatch[2], unit);
    return { min_price, max_price };
  }

  // 2) Dạng tối đa / dưới / không quá: "dưới 4 triệu", "tối đa 4 củ", "không quá 3tr5", "<= 4tr"
  const maxMatch = s.match(
    /(?:dưới|duoi|tối đa|toi da|không quá|khong qua|<=|<|tầm dưới)\s*(\d+(?:[.,]\d+)?)\s*(triệu|trieu|tr|củ|cu|k|nghìn|ngan|m)(?:\s|$|[,;.!?])/i
  );
  if (maxMatch) {
    const unit = maxMatch[2] || 'triệu';
    max_price = parseMoneyUnit(maxMatch[1], unit);
    return { min_price, max_price };
  }

  // 3) Dạng tối thiểu / trên / từ: "từ 3 triệu", "trên 2tr", "tối thiểu 3 củ", ">= 3tr"
  const minMatch = s.match(
    /(?:từ|tu|trên|tren|tối thiểu|toi thieu|ít nhất|it nhat|>=|>)\s*(\d+(?:[.,]\d+)?)\s*(triệu|trieu|tr|củ|cu|k|nghìn|ngan|m)(?:\s|$|[,;.!?])/i
  );
  if (minMatch) {
    const unit = minMatch[2] || 'triệu';
    min_price = parseMoneyUnit(minMatch[1], unit);
    return { min_price, max_price };
  }

  // 4) Dạng số kèm đơn vị tiền rõ ràng: "3 củ", "3 triệu", "3tr5", "3500k", "3.5tr", "tầm 3 củ"
  const exactUnitMatch = s.match(
    /(\d+(?:[.,]\d+)?)\s*(củ|cu|triệu|trieu|tr|k|nghìn|ngan)(?:\s|$|[,;.!?])/i
  );
  if (exactUnitMatch) {
    const unit = exactUnitMatch[2];
    const parsed = parseMoneyUnit(exactUnitMatch[1], unit);
    max_price = parsed;
    return { min_price, max_price };
  }

  return { min_price, max_price };
}

function extractAreaRange(text) {
  let min_area = null;
  let max_area = null;
  const s = text.toLowerCase();

  // Dạng khoảng: "20-30m2", "20 đến 30 m²"
  const rangeMatch = s.match(
    /(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mét vuông)?\s*(?:-|–|—|đến|to)\s*(\d+(?:[.,]\d+)?)\s*(m2|m²|mét vuông|met vuong)/i
  );
  if (rangeMatch) {
    min_area = parseFloat(rangeMatch[1].replace(',', '.'));
    max_area = parseFloat(rangeMatch[2].replace(',', '.'));
    return { min_area, max_area };
  }

  // Dạng tối thiểu: "trên 20m2", "từ 20m2", "tối thiểu 25m2"
  const minMatch = s.match(
    /(?:trên|tren|từ|tu|tối thiểu|toi thieu|ít nhất|it nhat|>=|>)\s*(\d+(?:[.,]\d+)?)\s*(m2|m²|mét vuông|met vuong)/i
  );
  if (minMatch) {
    min_area = parseFloat(minMatch[1].replace(',', '.'));
    return { min_area, max_area };
  }

  // Dạng tối đa: "dưới 30m2", "tối đa 30m2"
  const maxMatch = s.match(
    /(?:dưới|duoi|tối đa|toi da|không quá|khong qua|<=|<)\s*(\d+(?:[.,]\d+)?)\s*(m2|m²|mét vuông|met vuong)/i
  );
  if (maxMatch) {
    max_area = parseFloat(maxMatch[1].replace(',', '.'));
    return { min_area, max_area };
  }

  // Dạng đơn: "20m2", "khoảng 25m²"
  const singleMatch = s.match(
    /(?:khoảng|tầm)?\s*(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mét vuông|met vuong)/i
  );
  if (singleMatch) {
    min_area = parseFloat(singleMatch[1].replace(',', '.'));
    return { min_area, max_area };
  }

  return { min_area, max_area };
}

function extractPeopleCount(text) {
  const s = text.toLowerCase();
  if (/\b(?:1 mình|một mình|đơn thân|1 người|ở 1 mình)\b/i.test(s)) return 1;

  const match = s.match(/(\d+)\s*(?:người|nguoi|bạn|ban|đứa|dua|thành viên|khách)\b/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  const forMatch = s.match(/(?:cho|ở)\s*(\d+)\s*(?:người|nguoi|bạn|đứa)?/i);
  if (forMatch) {
    return parseInt(forMatch[1], 10);
  }

  return null;
}

function extractBedroomCount(text) {
  const s = text.toLowerCase();
  const match = s.match(/(\d+)\s*(?:pn|phòng ngủ|phong ngu|bed|bedroom)/i);
  if (match) return parseInt(match[1], 10);
  if (/\b(?:studio|phòng đơn)\b/i.test(s)) return 1;
  return null;
}

function extractAmenities(text) {
  const s = text.toLowerCase();

  // Máy lạnh
  let air_conditioner = null;
  if (/\b(?:máy lạnh|may lanh|điều hòa|dieu hoa|a\/c|ac)\b/i.test(s)) {
    air_conditioner = !/\b(?:không cần máy lạnh|ko cần máy lạnh|ko máy lạnh)\b/i.test(s);
  }

  // Máy giặt
  let washing_machine = null;
  if (/\b(?:máy giặt|may giat)\b/i.test(s)) {
    washing_machine = !/\b(?:không cần máy giặt|ko máy giặt)\b/i.test(s);
  }

  // WC riêng
  let private_wc = null;
  if (/\b(?:wc riêng|toilet riêng|vệ sinh riêng|khép kín|khep kin|nhà vệ sinh riêng)\b/i.test(s)) {
    private_wc = true;
  } else if (/\b(?:wc chung|toilet chung|vệ sinh chung)\b/i.test(s)) {
    private_wc = false;
  }

  // Bếp
  let kitchen = null;
  if (/\b(?:có bếp|nấu ăn|kệ bếp|tuỳ ý nấu ăn|được nấu ăn|khu bếp|bếp riêng)\b/i.test(s)) {
    kitchen = true;
  }

  // Chỗ để xe
  let parking = null;
  if (/\b(?:chỗ để xe|để xe|giữ xe|bãi xe|chỗ đậu xe|nhà xe|parking)\b/i.test(s)) {
    parking = true;
  }

  // Nội thất
  let full_furniture = null;
  if (/\b(?:full nội thất|đầy đủ nội thất|có nội thất|full đồ|nội thất cao cấp)\b/i.test(s)) {
    full_furniture = true;
  } else if (/\b(?:nhà trống|không nội thất|ko nội thất)\b/i.test(s)) {
    full_furniture = false;
  }

  // Danh sách nội thất cụ thể
  const furniture_list = [];
  if (/\b(?:tủ lạnh|tu lanh)\b/i.test(s)) furniture_list.push('Tủ lạnh');
  if (/\b(?:máy giặt|may giat)\b/i.test(s)) furniture_list.push('Máy giặt');
  if (/\b(?:máy lạnh|điều hòa)\b/i.test(s)) furniture_list.push('Máy lạnh');
  if (/\b(?:giường|nệm)\b/i.test(s)) furniture_list.push('Giường / Nệm');
  if (/\b(?:tủ quần áo|tủ đồ)\b/i.test(s)) furniture_list.push('Tủ quần áo');
  if (/\b(?:bàn làm việc|bàn học)\b/i.test(s)) furniture_list.push('Bàn làm việc');
  if (/\b(?:nóng lạnh|bình nóng lạnh|máy nước nóng)\b/i.test(s)) furniture_list.push('Máy nước nóng');
  if (/\b(?:sofa|bàn trà)\b/i.test(s)) furniture_list.push('Sofa');

  return {
    air_conditioner,
    washing_machine,
    private_wc,
    kitchen,
    parking,
    full_furniture,
    furniture_list,
  };
}

function extractPreferredLocationAndDistance(text) {
  let preferred_location = null;
  let max_distance = null;
  const s = text;

  // Khoảng cách: "cách trường không quá 3km", "bán kính 2km", "trong vòng 5km", "dưới 3km"
  const distMatch = s.match(/(?:cách|khoảng cách|bán kính|trong vòng|không quá|dưới)\s*(\d+(?:[.,]\d+)?\s*km)/i);
  if (distMatch) {
    max_distance = distMatch[1].trim();
  }

  // Địa điểm ưu tiên: "ưu tiên gần HUTECH", "gần ĐH Bách Khoa", "gần trường đại học FPT", "gần chợ Bà Chiểu", "gần Landmark 81"
  const locMatch = s.match(
    /(?:ưu tiên\s+)?(?:gần|canh|cạnh|quanh|khu vực)\s+([^,;.\n]+)/i
  );
  if (locMatch) {
    let rawLoc = locMatch[1]
      .replace(/\s*(?:và|với|có|khoảng|giá|cho|ở|tầm|từ|dưới|trên).*$/i, '')
      .replace(/(?:không quá|cách|dưới|bán kính)?\s*\d+(?:[.,]\d+)?\s*km.*$/i, '')
      .replace(/[.,;!]+$/, '')
      .trim();
    if (rawLoc.length >= 2 && !/^(máy lạnh|máy giặt|wc|bếp|chỗ để xe|phòng|nhà)/i.test(rawLoc)) {
      preferred_location = rawLoc;
    }
  }

  return { preferred_location, max_distance };
}

function extractMoveInDate(text) {
  const s = text.toLowerCase();
  if (/\b(?:ở liền|ở ngay|chuyển vào ngay|dọn vào liền|dọn vào ngay|ngay bây giờ|dọn vào luôn)\b/i.test(s)) {
    return 'Dọn vào ngay';
  }
  if (/(?:đầu tháng sau|dau thang sau|tháng sau|thang sau)/i.test(s)) {
    return 'Đầu tháng sau';
  }
  if (/(?:cuối tháng này|cuoi thang nay|cuối tháng|cuoi thang)/i.test(s)) {
    return 'Cuối tháng này';
  }
  const monthMatch = s.match(/(?:đầu|cuối|giữa)?\s*tháng\s*(\d{1,2})/i);
  if (monthMatch) {
    return `Tháng ${monthMatch[1]}`;
  }
  // Yêu cầu có dấu "/" (vd 15/09 hoặc 01/10/2026) để không nhầm với khoảng giá 3-4
  const dateMatch = s.match(/(?:ngày\s*)?(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (dateMatch) {
    return dateMatch[0];
  }
  return null;
}

function extractSpecialRequirements(text) {
  const reqs = [];
  const s = text.toLowerCase();

  if (/\b(?:giờ giấc tự do|tu do|ko chung chủ|không chung chủ|riêng tư)\b/i.test(s)) reqs.push('Giờ giấc tự do, không chung chủ');
  if (/\b(?:nuôi thú cưng|nuôi pet|pet friendly|cho nuôi pet|nuôi mèo|nuôi chó)\b/i.test(s)) reqs.push('Được nuôi thú cưng');
  if (/\b(?:ban công|cửa sổ|thoáng mát)\b/i.test(s)) reqs.push('Có ban công / cửa sổ thoáng');
  if (/\b(?:gác lửng|gác)\b/i.test(s)) reqs.push('Có gác lửng');
  if (/\b(?:thang máy|thang may)\b/i.test(s)) reqs.push('Có thang máy');
  if (/\b(?:bảo vệ|an ninh|camera|khóa vân tay)\b/i.test(s)) reqs.push('An ninh tốt / Khóa vân tay');
  if (/\b(?:yên tĩnh|học tập)\b/i.test(s)) reqs.push('Môi trường yên tĩnh');

  return reqs.length > 0 ? reqs.join('; ') : null;
}

function extractPhone(text) {
  const match = text.match(/(?:\+84|0)(?:3|5|7|8|9)\d{8}\b/);
  return match ? match[0] : null;
}

function extractFullName(text) {
  const patterns = [
    /(?:tên là|tôi là|mình là|tôi tên|mình tên|tên:?)\s+([^\s,;:.!?]+(?:\s+[^\s,;:.!?]+){1,4})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const name = m[1].replace(/\s*(?:cần|muốn|sđt|sdt|phone|sinh).*$/i, '').trim();
      if (name.length >= 2 && !/^(sinh viên|người đi làm|khách|chủ)/i.test(name)) {
        return name;
      }
    }
  }
  return null;
}

export function parseDemandText(text) {
  if (!text || typeof text !== 'string') {
    return { success: false, message: 'Nội dung văn bản không hợp lệ' };
  }

  const raw = text.trim();
  const district = extractDistrict(raw);
  const room_type = extractRoomType(raw);
  const { min_price, max_price } = extractPriceRange(raw);
  const { min_area, max_area } = extractAreaRange(raw);
  const people_count = extractPeopleCount(raw);
  const bedroom_count = extractBedroomCount(raw);
  const amenities = extractAmenities(raw);
  const { preferred_location, max_distance } = extractPreferredLocationAndDistance(raw);
  const move_in_date = extractMoveInDate(raw);
  const special_requirements = extractSpecialRequirements(raw);
  const phone = extractPhone(raw);
  const full_name = extractFullName(raw);

  // Tạo ghi chú tổng hợp tự nhiên
  const noteParts = [];
  if (preferred_location) noteParts.push(`Ưu tiên gần: ${preferred_location}`);
  if (max_distance) noteParts.push(`Khoảng cách tối đa: ${max_distance}`);
  if (special_requirements) noteParts.push(`Yêu cầu: ${special_requirements}`);
  if (amenities.furniture_list.length > 0) noteParts.push(`Cần nội thất: ${amenities.furniture_list.join(', ')}`);

  const result = {
    room_type,
    district,
    min_price,
    max_price,
    min_area,
    max_area,
    people_count,
    bedroom_count,
    air_conditioner: amenities.air_conditioner,
    washing_machine: amenities.washing_machine,
    private_wc: amenities.private_wc,
    kitchen: amenities.kitchen,
    parking: amenities.parking,
    full_furniture: amenities.full_furniture,
    furniture_list: amenities.furniture_list,
    max_distance,
    preferred_location,
    move_in_date,
    special_requirements,
    full_name,
    phone,
    note: noteParts.join('. ') || raw.slice(0, 200),
    raw_text: raw,
  };

  return {
    success: true,
    message: 'Phân tích nhu cầu thành công',
    data: result,
  };
}