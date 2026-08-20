/*
 * roomParser.js
 * Parser văn bản tiếng Việt tự nhiên -> dữ liệu phòng chuẩn hóa cho Smart Room Search.
 * Nguyên tắc: không bịa dữ liệu, không gộp phòng, chuẩn hóa tiền an toàn, giữ mọi thông tin.
 */

const HCMC_DISTRICTS = [
  'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7',
  'Quận 8', 'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12',
  'Bình Thạnh', 'Gò Vấp', 'Tân Bình', 'Tân Phú', 'Bình Tân', 'Phú Nhuận',
  'Thủ Đức', 'Nhà Bè', 'Hóc Môn', 'Củ Chi', 'Bình Chánh', 'Cần Giờ'
];

const DISTRICT_LOOKUP = {};
HCMC_DISTRICTS.forEach((d) => {
  DISTRICT_LOOKUP[d.toLowerCase()] = d;
});

const ROOM_CODE_RE = /\b(?:[A-Za-z]{1,4}[.\-]?)?\d{1,4}(?:[.\-]\d{1,2})?\b/g;

const FEE_LINE_HINTS = /điện|nước|internet|mạng|phí|giữ xe|để xe|parking|kwh|kw\b|dịch vụ|quản lý/i;

const PRICE_CONTEXT_SKIP = /điện|nước|internet|mạng|phí|giữ xe|để xe|parking|kwh|dịch vụ|quản lý|tiền điện|tiền nước/i;

const FEE_START_WORDS = /^(điện|nước|internet|mạng|phí dịch vụ|phí quản lý|dịch vụ|giữ xe|để xe|parking|tiện ích|tiện nghi|sđt|điện thoại|zalo|liên hệ|chủ phòng|diện tích|dt|giá|tình trạng|tối đa|ở|bảo vệ|wifi|camera|thang máy|máy giặt|ban công|cửa sổ|gác|khóa|vệ sinh|web|fb|email)/i;

const AMENITY_KEYWORDS = [
  ['wifi', /wifi|mạng không dây/i],
  ['máy lạnh', /máy lạnh|điều hòa|điều hoà|a\/c\b|ac\b/i],
  ['camera', /camera/i],
  ['thang máy', /thang máy/i],
  ['máy giặt', /máy giặt/i],
  ['ban công', /ban công/i],
  ['cửa sổ', /cửa sổ/i],
  ['gác lửng', /gác lửng|gác/i],
  ['chỗ để xe', /chỗ để xe|để xe|giữ xe|chỗ đậu/i],
  ['bảo vệ 24/7', /bảo vệ 24\/7|bảo vệ 24\/24|bảo vệ/i],
  ['khóa vân tay', /khóa vân tay|khóa thẻ|khóa cửa/i],
  ['vệ sinh chung', /vệ sinh chung|dọn dẹp chung/i],
  ['bếp', /bếp|nấu ăn/i],
  ['tủ lạnh', /tủ lạnh/i],
  ['tủ quần áo', /tủ quần áo|tủ đồ/i],
  ['nội thất', /nội thất|full nội thất|đầy đủ nội thất/i],
  ['sân thượng', /sân thượng/i],
  ['thú cưng', /thú cưng|pet/i],
];

/* ============ CHUẨN HÓA SỐ TIỀN ============ */

function fmtMoney(n) {
  return Number(n).toLocaleString('vi-VN');
}

/**
 * parseMoney - nhận diện + chuẩn hóa số tiền.
 * Trả về { value: number|null, warning: string|null }
 */
export function parseMoney(raw) {
  const s = String(raw).trim().toLowerCase();
  if (!s) return { value: null, warning: null };

  // 1) Dạng "4tr2", "4 tr", "4 triệu 2", "4,2 triệu", "3500k", "500k", "3000 nghìn"
  const unitMatch = s.match(
    /(\d+(?:[.,]\d+)?)\s*(triệu|tr|k|nghìn)\s*(\d+(?:[.,]\d+)?)?/i
  );
  if (unitMatch) {
    let main = parseFloat(unitMatch[1].replace(',', '.'));
    const unit = unitMatch[2];
    const extra = unitMatch[3] ? parseFloat(unitMatch[3].replace(',', '.')) : null;
    let value;
    if (unit === 'k' || unit === 'nghìn') {
      value = main * 1000 + (extra ? extra : 0);
    } else {
      // tr / triệu: "4tr2" = 4.2 triệu
      if (extra !== null) {
        value = (main + extra / 10) * 1000000;
      } else {
        value = main * 1000000;
      }
    }
    if (!Number.isFinite(value) || value <= 0) return { value: null, warning: null };
    return { value: Math.round(value), warning: null };
  }

  // 2) Dạng số trần "3,000,000" / "3.000.000" / "3,000,0000đ" / "3.000.000đ/tháng"
  const plainMatch = s.match(/(\d{1,3}(?:[.,]\d{3}){1,3})(?:đ|vnđ|đồng)?/i);
  if (plainMatch) {
    const groups = plainMatch[1].split(/[.,]/);
    const badGroups = groups.slice(1).filter((g) => g.length !== 3);
    const digits = groups.join('');

    if (badGroups.length === 0 && groups.length >= 2) {
      // Nhóm chuẩn 3 chữ số
      const value = parseInt(digits, 10);
      if (!Number.isNaN(value) && value > 0) return { value, warning: null };
    }

    // Nhóm bất thường (VD "3,000,0000" = 3 | 000 | 0000)
    // Lỗi nhập phổ biến: dư số 0 -> "3,000,0000đ" có khả năng là 3.000.000
    if (digits.length === 8 && /^[1-9]0{7}$/.test(digits)) {
      const value = parseInt(digits[0], 10) * 1000000;
      return {
        value,
        warning: `Giá '${raw}' có định dạng bất thường, đã chuẩn hóa thành ${fmtMoney(value)} VNĐ.`,
      };
    }
    if (digits.length === 7) {
      const value = parseInt(digits, 10);
      if (!Number.isNaN(value) && value > 0) return { value, warning: null };
    }

    return {
      value: null,
      warning: `Giá '${raw}' không xác định được, cần bạn xác nhận.`,
    };
  }

  return { value: null, warning: null };
}

/* ============ TÁCH KHỐI PHÒNG ============ */

function isRoomHeader(line) {
  const lower = line.toLowerCase().trim();
  if (/^(phòng|p\.)\s*\w/.test(lower)) return true;
  // Dòng bắt đầu bằng mã phòng (chữ + số) nhưng không phải dòng phí/địa chỉ
  if (/^[A-Za-z]{1,4}[.\-]?\d{1,4}/.test(line)) {
    if (FEE_START_WORDS.test(lower)) return false;
    if (/^(thạnh|tx|ấp|tổ|khu|đường|số)/i.test(lower)) return false;
    return true;
  }
  return false;
}

function splitBlocks(lines) {
  const blocks = [];
  let current = [];
  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) continue;
    if (isRoomHeader(stripped) && current.length > 0) {
      blocks.push(current);
      current = [];
    }
    current.push(stripped);
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

/* ============ TRÍCH XUẤT TRONG KHỐI ============ */

function extractCodes(headerLine) {
  // Bỏ phần giá phía sau dấu "-" (VD: "Phòng A21, A22 - 3,000,0000đ")
  const withoutPrice = headerLine
    .replace(/\s*[-–—]\s*[\d.,\s]+(?:tr|triệu|k|nghìn|đ|vnđ|đồng)?.*$/i, '')
    .replace(/^(phòng|p\.)\s*/i, '');
  const codes = [];
  const matches = withoutPrice.matchAll(ROOM_CODE_RE);
  const letterCodes = [];
  const digitCodes = [];
  for (const m of matches) {
    const code = m[1] || m[0];
    if (/^q\d{1,2}$/i.test(code)) continue; // "Q12" = Quận 12, không phải mã phòng
    if (/^\d+$/.test(code)) {
      digitCodes.push(code);
    } else {
      letterCodes.push(code);
    }
  }
  // Ưu tiên mã có chữ (B8, A21, P.305). Mã thuần số (101, 102) chỉ chấp nhận
  // khi dòng tiêu đề chỉ gồm mã phòng (không lẫn "20 mét vuông", "ở ...").
  const picked = letterCodes.length > 0
    ? letterCodes
    : /^[\s\d,/\-.]*$/.test(withoutPrice.trim())
      ? digitCodes
      : [];
  for (const code of picked) {
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

function extractFeeByUnit(line, kwRe) {
  // Chỉ lấy số ĐỨNG SAU từ khóa phí (VD "điện 3800" — không lấy "20" trong "20 mét vuông")
  const kwIdx = line.search(kwRe);
  const slice = kwIdx >= 0 ? line.slice(kwIdx) : line;
  // Ưu tiên dạng "4.000 đ/kw" / "4k/kWh" / "150.000 đ/tháng" (có dấu "/" hoặc "per")
  const slashMatch = slice.match(/(\d+(?:[.,]\d+)*)\s*(k)?\s*(đ|vnđ|đồng)?\s*(?:\/(?!\d)|per)/i);
  if (slashMatch) {
    let value = parseFloat(slashMatch[1].replace(/[.,](?=\d{3}$)/g, '').replace(',', '.'));
    if (slashMatch[2]) value *= 1000; // k / kWh
    if (Number.isFinite(value) && value > 0) return Math.round(value);
  }
  // Dạng không có dấu "/" (VD: "điện 3800", "nước 120k")
  const bareMatch = slice.match(/(\d+(?:[.,]\d+)*)\s*(k)?\s*(đ|vnđ|đồng)?/i);
  if (bareMatch) {
    let value = parseFloat(bareMatch[1].replace(/[.,](?=\d{3}$)/g, '').replace(',', '.'));
    if (bareMatch[2]) value *= 1000;
    if (Number.isFinite(value) && value > 0) return Math.round(value);
  }
  return null;
}

function extractNote(line, lower) {
  const note = line.match(/\(([^)]+)\)/);
  return note ? note[1].trim() : null;
}

function parseBlock(lines, warnings) {
  const headerLine = lines[0];
  const joined = lines.join(' ');
  const lower = joined.toLowerCase();

  const room = {
    title: '',
    description: '',
    address: '',
    price: null,
    area: null,
    images: [],
    status: 'available',
    electricity: null,
    water: null,
    internet: null,
    service_fee: null,
    max_people: null,
    district: '',
    city: '',
    lat: null,
    lng: null,
    amenities: [],
    phone: '',
    zalo_link: '',
    views: 0,
    contacts: 0,
    is_featured: 0,
    is_new: 1,
    is_cheap: 0,
    rating: 0,
  };

  const notes = [];

  /* Giá phòng: quét toàn văn bản, bỏ qua candidate đứng sau từ khóa phí */
  for (const pl of lines) {
    if (room.price !== null) break;
    const moneyCandidates = pl.match(
      /\d[\d.,]*\s*(?:tr|triệu|k|nghìn)\s*\d?|\d[\d.,]*\s*(?:đ|vnđ|đồng)?/gi
    ) || [];
    for (const cand of moneyCandidates) {
      const idx = pl.indexOf(cand);
      const before = pl.slice(Math.max(0, idx - 25), idx).toLowerCase();
      if (PRICE_CONTEXT_SKIP.test(before)) continue;
      const { value, warning } = parseMoney(cand);
      if (value !== null) {
        room.price = value;
        if (warning) warnings.push(warning);
        break;
      }
      if (warning) warnings.push(warning);
    }
  }

  /* Diện tích */
  const areaMatch = joined.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m\s*vuông|mét\s*vuông)/i);
  if (areaMatch) {
    const a = parseFloat(areaMatch[1].replace(',', '.'));
    if (Number.isFinite(a) && a > 0 && a <= 500) {
      room.area = Math.round(a * 10) / 10;
    } else {
      warnings.push(`Diện tích '${areaMatch[1]} m²' có vẻ không hợp lệ, bỏ qua.`);
    }
  } else {
    const dtMatch = joined.match(/(?:diện tích|dt)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    if (dtMatch) {
      const a = parseFloat(dtMatch[1].replace(',', '.'));
      if (Number.isFinite(a) && a > 0 && a <= 500) room.area = Math.round(a * 10) / 10;
    }
  }

  /* Số người tối đa */
  const peopleMatch = joined.match(/(?:ở|tối đa|chứa|cho|được)\s*(\d+)\s*người/i)
    || joined.match(/(\d+)\s*người\s*(?:\/|trên|mỗi|per)/i)
    || joined.match(/số người\s*(?:tối đa\s*)?[:=]?\s*(\d+)/i);
  if (peopleMatch) {
    const p = parseInt(peopleMatch[1], 10);
    if (Number.isInteger(p) && p > 0 && p <= 20) room.max_people = p;
  }

  /* Trạng thái (bỏ nội dung trong ngoặc — "bảo trì phòng..." trong ngoặc không tính) */
  const statusText = lower.replace(/\([^)]*\)/g, '');
  if (/(đã thuê|đã cho thuê|có người ở|có người thuê|hết phòng|cho thuê rồi|rented)/i.test(statusText)) {
    room.status = 'rented';
  } else if (/(bảo trì|đang sửa|sửa chữa|maintenance)/i.test(statusText)) {
    room.status = 'maintenance';
  } else if (/(còn trống|đang trống|còn phòng|chưa cho thuê|phòng trống|available)/i.test(statusText)) {
    room.status = 'available';
  }

  /* Các loại phí (mỗi loại độc lập — 1 dòng có thể chứa nhiều phí) */
  for (const line of lines) {
    const lc = line.toLowerCase();

    if (/điện(?! thoại)/.test(lc)) {
      const v = extractFeeByUnit(line, /điện(?! thoại)/i);
      if (v !== null && v <= 20000) {
        room.electricity = v;
        if (/đã gồm|bao gồm|gồm|tính luôn|đã bao/.test(lc) && /phí chung|1430|1\.430|1,430|1 430/.test(lc)) {
          const chungMatch = line.match(/(?:đã gồm|bao gồm|gồm)\s*([\d.,]+\s*k?)\s*(?:đ|vnđ)?/i);
          let chungText = 'phí chung';
          if (chungMatch) {
            // "1,430k" ở đây là 1.430 VNĐ/kWh (k là lỗi định dạng, không phải nghìn)
            const cv = parseFloat(chungMatch[1].replace(/k$/i, '').replace(/[.,](?=\d{3}$)/g, '').replace(',', '.'));
            if (Number.isFinite(cv) && cv > 0) chungText = `${fmtMoney(cv)} VNĐ/kWh phí chung`;
          }
          notes.push(`Điện ${fmtMoney(v)} VNĐ/kWh, đã gồm ${chungText}.`);
        }
      } else if (v !== null) {
        warnings.push(`Giá điện '${line.trim()}' có vẻ bất thường, bỏ qua.`);
      }
    }
    if (/nước/.test(lc)) {
      const v = extractFeeByUnit(line, /nước/i);
      if (v !== null) {
        room.water = v;
        notes.push(`Nước ${fmtMoney(v)} VNĐ/người/tháng.`);
      }
    }
    if (/internet|mạng/.test(lc)) {
      const v = extractFeeByUnit(line, /internet|mạng/i);
      if (v !== null) room.internet = v;
    }
    if (/phí(?=\s|$|[,;:])/.test(lc)) {
      const v = extractFeeByUnit(line, /phí/i);
      if (v !== null) {
        room.service_fee = v;
        const note = extractNote(line, lc);
        if (note) notes.push(`Phí dịch vụ ${fmtMoney(v)} VNĐ/tháng (${note}).`);
        else notes.push(`Phí dịch vụ ${fmtMoney(v)} VNĐ/tháng.`);
      }
    }
    if (/giữ xe|để xe|parking/.test(lc)) {
      const v = extractFeeByUnit(line, /giữ xe|để xe|parking/i);
      if (v !== null) {
        const text = `Giữ xe ${fmtMoney(v)} VNĐ/tháng/xe`;
        if (!room.amenities.some((a) => a.toLowerCase() === text.toLowerCase())) room.amenities.push(text);
        if (/\b24\/7|24\/24/.test(lc) && !room.amenities.some((a) => a.toLowerCase() === 'bảo vệ 24/7')) {
          room.amenities.push('Bảo vệ 24/7');
        }
      } else if (/\b24\/7|24\/24/.test(lc) && !room.amenities.some((a) => a.toLowerCase() === 'bảo vệ 24/7')) {
        room.amenities.push('Bảo vệ 24/7');
      }
    }
  }

  /* Tiện ích tường minh (dòng "Tiện ích: ...") */
  const amenityLine = lines.find((l) => /^tiện ích|^tiện nghi/i.test(l));
  if (amenityLine) {
    const after = amenityLine.replace(/^tiện ích\s*[:=\-]?/i, '').replace(/^tiện nghi\s*[:=\-]?/i, '');
    after.split(/[,;•·|]/).map((t) => t.trim()).filter(Boolean).forEach((t) => {
      if (!room.amenities.includes(t)) room.amenities.push(t);
    });
  }
  /* Tiện ích qua từ khóa */
  for (const [label, re] of AMENITY_KEYWORDS) {
    if (re.test(lower) && !room.amenities.some((a) => a.toLowerCase() === label.toLowerCase())) {
      room.amenities.push(label);
    }
  }
  // Loại bỏ trùng lặp (không phân biệt hoa thường)
  const seen = new Set();
  room.amenities = room.amenities.filter((a) => {
    const key = a.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  /* Quận / thành phố */
  const sortedDistricts = [...HCMC_DISTRICTS].sort((a, b) => b.length - a.length);
  for (const d of sortedDistricts) {
    if (new RegExp(`\\b${d.toLowerCase()}\\b`).test(lower)) {
      room.district = d;
      break;
    }
  }
  if (!room.district) {
    const qMatch = lower.match(/\bq\s*(\d{1,2})\b/i);
    if (qMatch) room.district = `Quận ${parseInt(qMatch[1], 10)}`;
  }
  if (room.district || /tphcm|tp\.?hcm|tp hcm|sài gòn|saigon|thành phố hồ chí minh|hồ chí minh|\bhcm\b/i.test(lower)) {
    room.city = 'TP.HCM';
  }

  /* SĐT & Zalo */
  const digitsOnly = joined.replace(/[\s.\-]/g, '');
  const phoneMatch = digitsOnly.match(/(0[35789]\d{8,9})/);
  const zaloUrl = joined.match(/(https?:\/\/zalo\.me\/\d+)/i);
  const zaloPhone = joined.match(/zalo\s*[:.]?\s*0[35789]\d{8,9}/i);
  if (zaloUrl) {
    room.zalo_link = zaloUrl[1];
    const zp = zaloUrl[1].match(/(\d{9,11})/);
    if (zp) room.phone = zp[1];
  } else if (zaloPhone) {
    room.zalo_link = `https://zalo.me/${zaloPhone[0].replace(/zalo\s*[:.]?\s*/i, '')}`;
  } else if (phoneMatch) {
    const p = phoneMatch[1];
    if (p.length === 10 || p.length === 11) {
      room.phone = p;
      room.zalo_link = `https://zalo.me/${p}`;
    }
  } else {
    // SĐT viết tách kiểu "033 724 4067" nhưng bị dính vào chữ khác
    const spacedPhone = joined.match(/(?:0\d{2})[\s.\-]?\d{3}[\s.\-]?\d{3,4}/);
    if (spacedPhone) {
      const p = spacedPhone[0].replace(/[\s.\-]/g, '');
      if (/^0[35789]\d{8,9}$/.test(p)) {
        room.phone = p;
        room.zalo_link = `https://zalo.me/${p}`;
      }
    }
  }

  /* Địa chỉ */
  const addressCandidates = lines.filter((l) => {
    const lc = l.toLowerCase();
    if (l === headerLine) return false;
    if (FEE_START_WORDS.test(lc)) return false;
    if (/^(phòng|p\.)/i.test(lc)) return false;
    if (/zalo|sđt|điện thoại|liên hệ|chủ phòng|web|fb/i.test(lc)) return false;
    const hasAddressHint = /\d{1,4}\s*[\/\\-]\s*\d{1,4}/.test(l) // 75/7
      || /đường|hẻm|ấp|tổ|phường|quận|thôn|xã|huyện|khu phố|trung tâm|chợ|trường|số \d|địa chỉ/i.test(lc);
    return hasAddressHint;
  });
  if (addressCandidates.length > 0) {
    const withDistrict = addressCandidates.find((l) => /quận|phường|huyện|thị trấn/i.test(l));
    room.address = (withDistrict || addressCandidates[0])
      .replace(/^địa chỉ\s*[:=\-]?\s*/i, '')
      .replace(/\bq\s*(\d{1,2})\b/i, 'Quận $1')
      .trim();
  } else {
    // Văn bản tự nhiên: "ở Lê Văn Khương Q12, giá..." hoặc "tại ..."
    const atMatch = joined.match(/(?:ở|tại)\s+([^,;]+?)(?=\s*,\s*(?:\d|giá|phòng|điện|nước|phí|giữ|tối đa|liên hệ|gọi)|$)/i);
    if (atMatch) {
      const rawAddr = atMatch[1].trim();
      if (rawAddr.length >= 5 && !/^(điện|nước|phí|giữ|tối đa|liên hệ|gọi)/i.test(rawAddr)) {
        room.address = rawAddr.replace(/\bq\s*(\d{1,2})\b/i, 'Quận $1');
      }
    }
  }

  /* Mô tả: các dòng văn xuôi còn lại + ghi chú phí */
  const proseLines = lines.filter((l) => {
    const lc = l.toLowerCase();
    if (l === headerLine) return false;
    if (l === room.address) return false;
    if (/^địa chỉ|^giá\b|^giá phòng|^giá thuê/.test(lc)) return false;
    if (FEE_LINE_HINTS.test(lc)) return false;
    if (/zalo|sđt|điện thoại|liên hệ|chủ phòng|web|fb|tiện ích|tiện nghi/i.test(lc)) return false;
    if (l.length < 25) return false;
    if (/^(phòng|p\.)/i.test(lc)) return false;
    return true;
  });
  const descParts = [];
  for (const pl of proseLines) {
    const cleaned = pl.replace(/^['"`+\-•\s]+/, '').replace(/['"`]+$/g, '').trim();
    if (cleaned.length >= 25) descParts.push(cleaned);
  }
  const elecNote = notes.find((n) => n.startsWith('Điện'));
  if (room.electricity !== null) {
    descParts.push(
      elecNote || `Điện ${fmtMoney(room.electricity)} VNĐ/kWh.`
    );
  }
  const waterNote = notes.find((n) => n.startsWith('Nước'));
  if (room.water !== null) {
    descParts.push(waterNote || `Nước ${fmtMoney(room.water)} VNĐ/người/tháng.`);
  }
  if (room.internet !== null) descParts.push(`Internet ${fmtMoney(room.internet)} VNĐ/tháng.`);
  descParts.push(...notes.filter((n) => !n.startsWith('Điện') && !n.startsWith('Nước')));
  room.description = descParts.join(' ');

  /* Tên phòng */
  const codes = extractCodes(headerLine);
  if (codes.length === 0) {
    const parts = ['Phòng trọ'];
    if (room.area !== null) parts.push(`${room.area}m²`);
    if (room.district) parts.push(room.district);
    room.title = parts.join(' ');
  }

  /* is_cheap: giá/m² */
  if (room.price !== null && room.area !== null && room.area > 0) {
    const perM2 = room.price / room.area;
    room.is_cheap = perM2 <= 120000 && room.price <= 3000000 ? 1 : 0;
  } else {
    room.is_cheap = 0;
  }

  return { room, codes, warnings };
}

/* ============ XỬ LÝ CÂU LỆNH UPDATE ============ */

function detectUpdate(lines, warnings) {
  const joined = lines.join(' ').trim();
  const m = joined.match(/(?:sửa|cập nhật|update|đổi|chỉnh)\s*(?:phòng|p\.?)?\s*#?\s*(\d{5,})/i);
  if (!m) return null;
  const roomId = parseInt(m[1], 10);
  const fields = {};

  const priceM = joined.match(/(?:giá|price|thành)\s*[:=]?\s*([\d.,\s]+(?:tr|triệu|k|nghìn)\s*\d?|[\d.,\s]+(?:đ|vnđ)?)/i);
  if (priceM) {
    const { value, warning } = parseMoney(priceM[1]);
    if (value !== null) fields.price = value;
    else if (warning) warnings.push(warning);
  }
  if (/(còn trống|đang trống|còn phòng|available)/i.test(joined)) fields.status = 'available';
  else if (/(đã thuê|đã cho thuê|có người ở|rented)/i.test(joined)) fields.status = 'rented';
  else if (/(bảo trì|đang sửa|maintenance)/i.test(joined)) fields.status = 'maintenance';

  const areaM = joined.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m\s*vuông|mét\s*vuông)/i);
  if (areaM) fields.area = parseFloat(areaM[1].replace(',', '.'));

  const peopleM = joined.match(/(?:ở|tối đa)\s*(\d+)\s*người/i);
  if (peopleM) fields.max_people = parseInt(peopleM[1], 10);

  return { room_id: roomId, fields };
}

/* ============ PARSER CHÍNH ============ */

export function parseRoomsText(text) {
  const warnings = [];
  const errors = [];
  const rooms = [];
  const updates = [];

  const rawLines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/^['"`\s]*\+['"`\s]*/, '').trim())
    .filter(Boolean);

  if (rawLines.length === 0) {
    return { rooms: [], updates: [], warnings: [], errors: ['Không có nội dung để phân tích'] };
  }

  const blocks = splitBlocks(rawLines);

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const blockWarnings = [];

    const update = detectUpdate(block, blockWarnings);
    if (update) {
      updates.push({ ...update, raw: block.join('\n') });
      warnings.push(...blockWarnings);
      continue;
    }

    const { room, codes } = parseBlock(block, blockWarnings);
    warnings.push(...blockWarnings);

    if (codes.length === 0) {
      // Phòng không có mã -> validate trực tiếp
      const errs = validateRoom(room);
      if (errs.length > 0) {
        errors.push({ block: bi + 1, text: block.join(' ').slice(0, 120), errors: errs });
      } else {
        rooms.push(toApiRoom(room));
      }
      continue;
    }

    for (const code of codes) {
      const clone = { ...room, title: code };
      const errs = validateRoom(clone);
      if (errs.length > 0) {
        errors.push({ block: bi + 1, text: `${code} — ${block.join(' ').slice(0, 120)}`, errors: errs });
      } else {
        rooms.push(toApiRoom(clone));
      }
    }
  }

  return { rooms, updates, warnings: dedupe(warnings), errors };
}

function validateRoom(room) {
  const errs = [];
  if (!String(room.title || '').trim()) errs.push('Thiếu tên phòng');
  if (room.price === null || !(room.price > 0)) errs.push('Thiếu hoặc không xác định được giá');
  if (!String(room.address || '').trim()) errs.push('Thiếu địa chỉ');
  return errs;
}

/* Chuyển object nội bộ (snake_case) sang payload API (camelCase) */
function toApiRoom(room) {
  return {
    title: room.title,
    description: room.description || '',
    address: room.address,
    price: room.price,
    area: room.area,
    images: room.images || [],
    status: room.status,
    electricity: room.electricity,
    water: room.water,
    internet: room.internet,
    serviceFee: room.service_fee,
    maxPeople: room.max_people,
    district: room.district || '',
    city: room.city || 'TP.HCM',
    lat: room.lat,
    lng: room.lng,
    amenities: room.amenities || [],
    phone: room.phone || '',
    zaloLink: room.zalo_link || '',
    views: 0,
    contacts: 0,
    isFeatured: room.is_featured,
    isNew: 1,
    isCheap: room.is_cheap,
    rating: 0,
  };
}

function dedupe(arr) {
  return [...new Set(arr)];
}