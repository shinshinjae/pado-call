/** UI strings of the tourist app in 5 languages (the control dashboard is Korean only). */
import type { L10n, Lang } from '../data/places';

export const LANGS: { id: Lang; label: string; html: string }[] = [
  { id: 'ko', label: '한국어', html: 'ko' },
  { id: 'en', label: 'English', html: 'en' },
  { id: 'ja', label: '日本語', html: 'ja' },
  { id: 'zhHans', label: '简体中文', html: 'zh-Hans' },
  { id: 'zhHant', label: '繁體中文', html: 'zh-Hant' },
];

const S = {
  'nav.call': { ko: '호출', en: 'Call', ja: '呼ぶ', zhHans: '叫车', zhHant: '叫車' },
  'nav.wave': { ko: '혼잡', en: 'Wave', ja: '混雑', zhHans: '拥挤', zhHant: '擁擠' },
  'nav.trips': { ko: '내 여정', en: 'Trips', ja: '旅程', zhHans: '行程', zhHant: '行程' },
  'lang.label': { ko: '언어', en: 'Language', ja: '言語', zhHans: '语言', zhHant: '語言' },
  'demo.badge': { ko: '시연 · 가상 데이터', en: 'Demo · virtual data', ja: 'デモ · 仮想データ', zhHans: '演示 · 虚拟数据', zhHant: '示範 · 虛擬資料' },

  'call.seg.airport': { ko: '공항 셔틀', en: 'Airport shuttle', ja: '空港シャトル', zhHans: '机场班车', zhHant: '機場接駁車' },
  'call.seg.ride': { ko: '지금 호출', en: 'Ride now', ja: '今すぐ呼ぶ', zhHans: '立即叫车', zhHant: '立即叫車' },
  'call.arr': { ko: '부산 도착', en: 'Arriving in Busan', ja: '釜山に到着', zhHans: '抵达釜山', zhHant: '抵達釜山' },
  'call.dep': { ko: '부산 출발', en: 'Leaving Busan', ja: '釜山から出発', zhHans: '离开釜山', zhHant: '離開釜山' },
  'call.flight': { ko: '항공편', en: 'Flight number', ja: '便名', zhHans: '航班号', zhHant: '航班號碼' },
  'call.landing': { ko: '도착 시각', en: 'Landing time', ja: '到着時刻', zhHans: '降落时间', zhHant: '降落時間' },
  'call.depTime': { ko: '항공편 출발 시각', en: 'Flight departure', ja: '出発時刻（航空便）', zhHans: '航班起飞时间', zhHant: '航班起飛時間' },
  'call.hotelArea': { ko: '숙소 지역', en: 'Hotel area', ja: 'ホテルのエリア', zhHans: '酒店区域', zhHant: '飯店區域' },
  'call.travelers': { ko: '인원', en: 'Travelers', ja: '人数', zhHans: '人数', zhHant: '人數' },
  'call.bags': { ko: '큰 짐', en: 'Large bags', ja: '大きな荷物', zhHans: '大件行李', zhHant: '大件行李' },
  'call.departs': { ko: '{t} 출발', en: 'Leaves at {t}', ja: '{t} 発', zhHans: '{t} 发车', zhHant: '{t} 發車' },
  'call.after': { ko: '짐 찾고 {m} 뒤', en: '{m} after you collect your bags', ja: '荷物を受け取ってから{m}後', zhHans: '取完行李后{m}', zhHant: '領完行李後{m}' },
  'call.afterNow': { ko: '짐 찾은 직후', en: 'as soon as you collect your bags', ja: '荷物を受け取ってすぐ', zhHans: '取完行李即可出发', zhHant: '領完行李即可出發' },
  'call.eta': { ko: '숙소 도착 약 {t}', en: 'At your hotel around {t}', ja: 'ホテル到着 {t}ごろ', zhHans: '约{t}到达酒店', zhHant: '約{t}抵達飯店' },
  'call.eta90': { ko: '10번 중 9번은 {t}까지 도착', en: '9 in 10 trips arrive by {t}', ja: '10回中9回は{t}までに到着', zhHans: '10次中有9次在{t}前到达', zhHant: '10次中有9次在{t}前抵達' },
  'call.shared0': { ko: '현재 합승 없음', en: 'Just your group so far', ja: '今のところ相乗りなし', zhHans: '目前无人拼车', zhHant: '目前無人共乘' },
  'call.shared1': { ko: '다른 1팀과 합승', en: 'Shared with 1 other group', ja: 'ほかの1組と相乗り', zhHans: '与另外1组拼车', zhHant: '與另外1組共乘' },
  'call.sharedN': { ko: '다른 {n}팀과 합승', en: 'Shared with {n} other groups', ja: 'ほかの{n}組と相乗り', zhHans: '与另外{n}组拼车', zhHant: '與另外{n}組共乘' },
  'call.fare': { ko: '요금', en: 'Fare', ja: '料金', zhHans: '车费', zhHant: '車資' },
  'call.delayTitle': { ko: '항공편이 늦어지면', en: 'If your flight is late', ja: '便が遅れたら', zhHans: '如果航班延误', zhHant: '如果航班延誤' },
  'call.delayBody': {
    ko: '다음 셔틀로 자동 변경돼요. 다시 예약할 필요 없어요.',
    en: 'We move you to the next shuttle automatically. No need to rebook.',
    ja: '次のシャトルに自動で振り替えます。予約し直す必要はありません。',
    zhHans: '系统会自动为您改到下一班，无需重新预约。',
    zhHant: '系統會自動為您改搭下一班，無需重新預約。',
  },
  'call.delaySim': { ko: '40분 지연 가정', en: 'Try a 40-min delay', ja: '40分遅れで試す', zhHans: '模拟延误40分钟', zhHant: '模擬延誤40分鐘' },
  'call.delayResult': { ko: '변경 출발 {t} · 숙소 도착 약 {t2}', en: 'New departure {t} · at your hotel around {t2}', ja: '変更後 {t} 発 · ホテル到着 {t2}ごろ', zhHans: '改为{t}发车 · 约{t2}到达酒店', zhHant: '改為{t}發車 · 約{t2}抵達飯店' },
  'call.meet': {
    ko: '만나는 곳: 국제선 도착층, 파란 PADO CALL 표지판',
    en: 'Meet at international arrivals, by the blue PADO CALL sign',
    ja: '集合場所：国際線到着ロビー、青い PADO CALL の看板',
    zhHans: '集合点：国际到达大厅，蓝色 PADO CALL 指示牌',
    zhHant: '集合點：國際線入境大廳，藍色 PADO CALL 指示牌',
  },
  'call.compare': {
    ko: '다른 방법: 공항 리무진(2개 노선·고정 정류장), 택시',
    en: 'Other ways: airport limousine (2 routes, fixed stops), taxi',
    ja: 'ほかの方法：空港リムジン（2路線・停留所固定）、タクシー',
    zhHans: '其他方式：机场大巴（2条线路，固定站点）、出租车',
    zhHant: '其他方式：機場巴士（2條路線、固定站點）、計程車',
  },
  'call.book': { ko: '공항 셔틀 예약', en: 'Book airport shuttle', ja: '空港シャトルを予約', zhHans: '预约机场班车', zhHant: '預約機場接駁車' },
  'call.bookPickup': { ko: '숙소 픽업 예약', en: 'Book hotel pickup', ja: 'ホテル送迎を予約', zhHans: '预约酒店接送', zhHant: '預約飯店接送' },
  'call.slots': { ko: '항공편 시간에 맞는 합승 픽업', en: 'Shared pickups that reach the airport in time', ja: 'フライトに間に合う相乗り送迎', zhHans: '赶得上航班的拼车接送', zhHant: '趕得上航班的共乘接送' },
  'call.slot': { ko: '{t} 숙소 출발 → 공항 약 {t2}', en: 'Hotel {t} → airport around {t2}', ja: '{t} ホテル発 → 空港 {t2}ごろ', zhHans: '{t} 酒店出发 → 约{t2}到机场', zhHant: '{t} 飯店出發 → 約{t2}抵達機場' },
  'call.slotBefore': { ko: '항공편 출발 {h} 전 도착', en: '{h} before your flight', ja: '出発の{h}前に到着', zhHans: '起飞前{h}到达', zhHant: '起飛前{h}抵達' },
  'call.noSlot': {
    ko: '이 항공편에 맞는 합승 셔틀이 없어요. 제휴 택시를 연결해 드려요.',
    en: "No shared shuttle fits this flight. We'll connect you with a partner taxi.",
    ja: 'このフライトに合う相乗りシャトルがありません。提携タクシーをご案内します。',
    zhHans: '没有适合该航班的拼车班次，我们将为您联系合作出租车。',
    zhHant: '沒有適合此航班的共乘班次，我們將為您聯繫合作計程車。',
  },
  'call.noSeat': {
    ko: '이 시간에는 좌석이 없어요. 시간을 바꾸거나 제휴 택시를 이용하세요.',
    en: 'No seat at this time. Try another time or a partner taxi.',
    ja: 'この時間は満席です。時間を変えるか提携タクシーをご利用ください。',
    zhHans: '该时间没有座位，请更换时间或使用合作出租车。',
    zhHant: '此時段沒有座位，請更換時間或使用合作計程車。',
  },
  'call.ready': {
    ko: '{t}쯤 준비 완료 (입국·짐 찾기 약 25분)',
    en: 'Ready around {t} (about 25 min for immigration and bags)',
    ja: '{t}ごろ準備完了（入国・荷物受け取り 約25分）',
    zhHans: '约{t}准备好（入境和取行李约25分钟）',
    zhHant: '約{t}準備好（入境與領行李約25分鐘）',
  },
  'call.flightPh': { ko: '예: KE 1234', en: 'e.g. KE 1234', ja: '例：KE 1234', zhHans: '例如 KE 1234', zhHant: '例如 KE 1234' },
  'call.vanNote': { ko: '짐칸 있는 승합차 · 숙소 앞 하차', en: 'Van with luggage space · door to door', ja: '荷物スペース付きのバン · ホテルの前で降車', zhHans: '带行李空间的面包车 · 送到酒店门口', zhHant: '附行李空間的廂型車 · 送到飯店門口' },

  'ride.from': { ko: '승차', en: 'Pickup', ja: '乗車地', zhHans: '上车点', zhHant: '上車點' },
  'ride.to': { ko: '목적지', en: 'Destination', ja: '目的地', zhHans: '目的地', zhHant: '目的地' },
  'zone.A': { ko: 'A권역 · 해운대·광안리', en: 'Zone A · Haeundae & Gwangalli', ja: 'Aエリア · 海雲台・広安里', zhHans: 'A区 · 海云台·广安里', zhHant: 'A區 · 海雲台·廣安里' },
  'zone.B': { ko: 'B권역 · 원도심·영도', en: 'Zone B · Old town & Yeongdo', ja: 'Bエリア · 旧市街・影島', zhHans: 'B区 · 老城区·影岛', zhHant: 'B區 · 舊城區·影島' },
  'zone.areaA': { ko: '해운대·광안리', en: 'Haeundae & Gwangalli', ja: '海雲台・広安里', zhHans: '海云台·广安里', zhHant: '海雲台·廣安里' },
  'zone.areaB': { ko: '원도심·영도', en: 'Old town & Yeongdo', ja: '旧市街・影島', zhHans: '老城区·影岛', zhHant: '舊城區·影島' },
  'zone.shortA': { ko: 'A권역', en: 'Zone A', ja: 'Aエリア', zhHans: 'A区', zhHant: 'A區' },
  'zone.shortB': { ko: 'B권역', en: 'Zone B', ja: 'Bエリア', zhHans: 'B区', zhHant: 'B區' },
  'ride.waitLabel': { ko: '지금 부르면 대기시간', en: 'Pickup wait if you call now', ja: '今呼んだ場合の待ち時間', zhHans: '现在叫车的等候时间', zhHant: '現在叫車的等候時間' },
  'ride.heroSub': {
    ko: '10번 중 9번은 이 시간 안에 승차 · 평균 {a}',
    en: '9 in 10 calls are picked up by then · average\u00a0{a}',
    ja: '10回中9回はこの時間内に乗車 · 平均{a}',
    zhHans: '10次中有9次在此时间内上车 · 平均{a}',
    zhHant: '10次中有9次在此時間內上車 · 平均{a}',
  },
  'ride.within': { ko: '{m} 이내', en: 'within {m}', ja: '{m}以内', zhHans: '{m}内', zhHant: '{m}內' },
  'ride.fleet': { ko: '이 권역 운행 차량 {n}대', en: '{n} shuttles running in this zone', ja: 'このエリアで運行中 {n}台', zhHans: '本区运行车辆 {n}辆', zhHant: '本區行駛車輛 {n}輛' },
  'ride.trip': { ko: '이동 약 {m} · {t}쯤 도착', en: 'Ride about {m} · arrive around {t}', ja: '乗車 約{m} · {t}ごろ到着', zhHans: '车程约{m} · 约{t}到达', zhHant: '車程約{m} · 約{t}抵達' },
  'ride.crowd': { ko: '{t}쯤 {place}: {level}', en: '{place} around {t}: {level}', ja: '{t}ごろの{place}：{level}', zhHans: '约{t}的{place}：{level}', zhHant: '約{t}的{place}：{level}' },
  'ride.alt': { ko: '근처 덜 붐비는 곳', en: 'Calmer nearby', ja: '近くの空いている場所', zhHans: '附近较空的地方', zhHant: '附近較空的地方' },
  'ride.pickupGuide': { ko: '여기서 기다리세요', en: 'Wait here', ja: 'ここでお待ちください', zhHans: '请在这里等候', zhHant: '請在這裡等候' },
  'ride.photo': { ko: '사진 안내', en: 'Photo guide', ja: '写真ガイド', zhHans: '照片指引', zhHant: '照片指引' },
  'ride.opt.wheelchair': { ko: '휠체어 공간', en: 'Wheelchair space', ja: '車いすスペース', zhHans: '轮椅空间', zhHant: '輪椅空間' },
  'ride.opt.stroller': { ko: '유아차', en: 'Stroller', ja: 'ベビーカー', zhHans: '婴儿车', zhHant: '嬰兒車' },
  'ride.opt.luggage': { ko: '짐', en: 'Luggage', ja: '荷物', zhHans: '行李', zhHant: '行李' },
  'ride.fare': { ko: '1인 3,000원 · 1일권 9,900원', en: '₩3,000 per person · day pass ₩9,900', ja: '1人 3,000ウォン · 1日券 9,900ウォン', zhHans: '每人 3,000韩元 · 一日票 9,900韩元', zhHant: '每人 3,000韓元 · 一日票 9,900韓元' },
  'ride.call': { ko: '셔틀 부르기', en: 'Call shuttle', ja: 'シャトルを呼ぶ', zhHans: '叫班车', zhHant: '叫接駁車' },
  'ride.closed': {
    ko: '운행 시간 {o}–{c}. 첫 셔틀은 {o}에 출발해요.',
    en: 'Service hours {o}–{c}. The first shuttle leaves at {o}.',
    ja: '運行時間 {o}–{c}。始発は{o}です。',
    zhHans: '运营时间 {o}–{c}。首班车{o}出发。',
    zhHant: '營運時間 {o}–{c}。首班車{o}發車。',
  },
  'ride.voice': { ko: '말로 목적지 입력', en: 'Say a place', ja: '声で入力', zhHans: '语音输入', zhHant: '語音輸入' },
  'ride.voiceHeard': { ko: '들은 말: "{s}"', en: 'Heard: "{s}"', ja: '認識：「{s}」', zhHans: '识别：“{s}”', zhHant: '辨識：「{s}」' },
  'ride.voiceMiss': { ko: '그 장소를 찾지 못했어요. 목록에서 골라 주세요.', en: "Couldn't find that place. Please pick it from the list.", ja: 'その場所が見つかりませんでした。リストから選んでください。', zhHans: '没有找到该地点，请从列表中选择。', zhHant: '找不到該地點，請從清單中選擇。' },
  'ride.sameZone': { ko: '셔틀은 같은 권역 안에서 운행해요', en: 'Shuttles run within one zone', ja: 'シャトルは同じエリア内で運行します', zhHans: '班车在同一区域内运行', zhHant: '接駁車在同一區域內行駛' },

  'wave.now': { ko: '지금', en: 'Now', ja: '今', zhHans: '现在', zhHant: '現在' },
  'wave.plus': { ko: '+{h}시간', en: '+{h} h', ja: '+{h}時間', zhHans: '+{h}小时', zhHant: '+{h}小時' },
  'level.0': { ko: '쾌적', en: 'Comfortable', ja: '快適', zhHans: '舒适', zhHant: '舒適' },
  'level.1': { ko: '보통', en: 'Moderate', ja: 'ふつう', zhHans: '一般', zhHant: '普通' },
  'level.2': { ko: '붐빔', en: 'Busy', ja: 'やや混雑', zhHans: '较拥挤', zhHant: '略擁擠' },
  'level.3': { ko: '혼잡', en: 'Crowded', ja: '混雑', zhHans: '拥挤', zhHant: '擁擠' },
  'wave.alert': { ko: '{place}: {t}부터 혼잡 예상 (가능성 {p})', en: '{place}: crowded from {t} ({p} chance)', ja: '{place}：{t}から混雑の見込み（確率 {p}）', zhHans: '{place}：预计{t}起拥挤（概率 {p}）', zhHant: '{place}：預計{t}起擁擠（機率 {p}）' },
  'wave.alertNow': { ko: '{place}: 지금 혼잡해요', en: '{place} is crowded now', ja: '{place}は今混雑しています', zhHans: '{place}现在很拥挤', zhHant: '{place}現在很擁擠' },
  'wave.best': { ko: '오늘 남은 시간 중 가장 한산: {t}', en: 'Calmest time left today: {t}', ja: '今日これから一番空いている時間：{t}', zhHans: '今天剩余时间最空闲：{t}', zhHant: '今天剩餘時間最空閒：{t}' },
  'wave.bestNone': { ko: '오늘은 문 닫을 때까지 붐벼요. 아래의 덜 붐비는 곳을 확인하세요.', en: 'Busy until closing today. See calmer places below.', ja: '今日は閉まるまで混雑します。下の空いている場所をご覧ください。', zhHans: '今天到关门前都很拥挤，请看下方较空的地方。', zhHant: '今天到關門前都很擁擠，請看下方較空的地方。' },
  'wave.closed': { ko: '이 시간에는 운영하지 않아요', en: 'Closed at this hour', ja: 'この時間は営業していません', zhHans: '该时段不开放', zhHant: '此時段不開放' },
  'wave.callThere': { ko: '셔틀로 가기', en: 'Ride there', ja: 'シャトルで行く', zhHans: '乘班车前往', zhHant: '搭接駁車前往' },
  'wave.note': {
    ko: '혼잡지수 = 체류 인원 ÷ 쾌적 수용 인원. 매시간 관측으로 보정한 예측 · 시연용 가상 데이터',
    en: 'Crowd level = people on site ÷ comfortable capacity. Forecast updated with hourly observations · demo data',
    ja: '混雑指数＝滞在人数÷快適な収容人数。毎時の観測で補正した予測 · デモ用の仮想データ',
    zhHans: '拥挤指数＝现场人数÷舒适容量。每小时根据观测更新的预测 · 演示用虚拟数据',
    zhHant: '擁擠指數＝現場人數÷舒適容量。每小時依觀測更新的預測 · 示範用虛擬資料',
  },
  'wave.ci': { ko: '혼잡지수', en: 'Crowd level', ja: '混雑指数', zhHans: '拥挤指数', zhHant: '擁擠指數' },
  'wave.chance': { ko: '혼잡 가능성', en: 'Chance of crowding', ja: '混雑の確率', zhHans: '拥挤概率', zhHant: '擁擠機率' },
  'wave.today': { ko: '오늘의 혼잡 예측', en: "Today's crowd forecast", ja: '今日の混雑予測', zhHans: '今日拥挤预测', zhHant: '今日擁擠預測' },
  'wave.mapNote': { ko: '권역 경계·승차 위치는 개략 위치예요', en: 'Zone borders and pickup points are approximate', ja: 'エリア境界と乗車位置はおおよその位置です', zhHans: '区域边界和上车点为大致位置', zhHant: '區域邊界和上車點為大致位置' },
  'wave.pick': { ko: '지도에서 명소를 고르세요', en: 'Pick a place on the map', ja: '地図でスポットを選んでください', zhHans: '在地图上选择景点', zhHant: '在地圖上選擇景點' },

  'trips.title': { ko: '내 여정', en: 'My trips', ja: '旅程', zhHans: '我的行程', zhHant: '我的行程' },
  'trips.empty': { ko: '아직 여정이 없어요', en: 'No trips yet', ja: 'まだ旅程はありません', zhHans: '还没有行程', zhHant: '還沒有行程' },
  'trips.emptyBody': {
    ko: '공항 셔틀을 예약하거나 셔틀을 부르면 QR 탑승권과 함께 여기에 표시돼요.',
    en: 'Book an airport shuttle or call a ride and it appears here with your QR boarding pass.',
    ja: '空港シャトルを予約するかシャトルを呼ぶと、QR乗車券と一緒にここに表示されます。',
    zhHans: '预约机场班车或叫车后，行程和二维码乘车券会显示在这里。',
    zhHant: '預約機場接駁車或叫車後，行程與QR碼乘車券會顯示在這裡。',
  },
  'trips.code': { ko: '승차 코드', en: 'Boarding code', ja: '乗車コード', zhHans: '乘车码', zhHant: '乘車碼' },
  'trips.cancel': { ko: '취소', en: 'Cancel', ja: 'キャンセル', zhHans: '取消', zhHant: '取消' },
  'trips.cancelled': { ko: '취소됨', en: 'Cancelled', ja: 'キャンセル済み', zhHans: '已取消', zhHant: '已取消' },
  'trips.s.booked': { ko: '예약됨', en: 'Booked', ja: '予約済み', zhHans: '已预约', zhHant: '已預約' },
  'trips.s.coming': { ko: '오는 중', en: 'On the way', ja: '向かっています', zhHans: '正在赶来', zhHant: '正在趕來' },
  'trips.s.onboard': { ko: '탑승 중', en: 'On board', ja: '乗車中', zhHans: '乘车中', zhHant: '乘車中' },
  'trips.s.done': { ko: '완료', en: 'Completed', ja: '完了', zhHans: '已完成', zhHant: '已完成' },
  'trips.airportArr': { ko: '공항 → 숙소', en: 'Airport → hotel', ja: '空港 → ホテル', zhHans: '机场 → 酒店', zhHant: '機場 → 飯店' },
  'trips.airportDep': { ko: '숙소 → 공항', en: 'Hotel → airport', ja: 'ホテル → 空港', zhHans: '酒店 → 机场', zhHant: '飯店 → 機場' },
  'trips.ride': { ko: '권역 셔틀', en: 'Zone shuttle', ja: 'エリアシャトル', zhHans: '区域班车', zhHant: '區域接駁車' },
  'trips.pickupAt': { ko: '승차 {t}', en: 'Pickup {t}', ja: '乗車 {t}', zhHans: '上车 {t}', zhHant: '上車 {t}' },
  'trips.arriveAt': { ko: '도착 {t}', en: 'Arrive {t}', ja: '到着 {t}', zhHans: '到达 {t}', zhHant: '抵達 {t}' },
  'trips.show': { ko: '기사님께 이 코드를 보여 주세요', en: 'Show this code to the driver', ja: 'このコードを運転手に見せてください', zhHans: '请向司机出示此码', zhHant: '請向司機出示此碼' },
  'toast.cancelled': { ko: '취소했어요', en: 'Cancelled', ja: 'キャンセルしました', zhHans: '已取消', zhHant: '已取消' },
  'toast.paidCalled': { ko: '카드 승인 완료 · 셔틀이 출발했어요 (약 {m} 뒤 도착)', en: 'Card authorised · the shuttle is on its way (about {m})', ja: 'カード承認完了・シャトルが出発しました（約{m}で到着）', zhHans: '已预授权 · 班车已出发（约{m}后到达）', zhHant: '已預授權 · 接駁車已出發（約{m}後抵達）' },
  'toast.paidBooked': { ko: '카드 승인 완료 · QR 탑승권이 발급됐어요', en: 'Card authorised · your QR boarding pass is ready', ja: 'カード承認完了・QR乗車券を発行しました', zhHans: '已预授权 · 二维码乘车券已发放', zhHant: '已預授權 · QR碼乘車券已發放' },
  'toast.cancelFree': { ko: '취소했어요 · 카드 승인도 풀렸어요', en: 'Cancelled · the card authorisation was released', ja: 'キャンセルしました・カード承認も取り消されました', zhHans: '已取消 · 预授权已撤销', zhHant: '已取消 · 預授權已撤銷' },

  'pay.title.ride': { ko: '결제하고 부르기', en: 'Pay and call', ja: '支払って呼ぶ', zhHans: '付款并叫车', zhHant: '付款並叫車' },
  'pay.title.airport': { ko: '결제하고 예약하기', en: 'Pay and book', ja: '支払って予約', zhHans: '付款并预约', zhHant: '付款並預約' },
  'pay.summary': { ko: '{a} → {b} · {n}명', en: '{a} → {b} · {n} pax', ja: '{a} → {b}・{n}名', zhHans: '{a} → {b} · {n}人', zhHant: '{a} → {b} · {n}人' },
  'pay.method': { ko: '결제 수단', en: 'Payment method', ja: '支払い方法', zhHans: '支付方式', zhHant: '支付方式' },
  'pay.card': { ko: '해외 카드 (Visa · Mastercard)', en: 'International card (Visa · Mastercard)', ja: '海外カード（Visa・Mastercard）', zhHans: '境外银行卡（Visa · Mastercard）', zhHant: '境外信用卡（Visa · Mastercard）' },
  'pay.wallet': { ko: 'Apple Pay · Google Pay', en: 'Apple Pay · Google Pay', ja: 'Apple Pay・Google Pay', zhHans: 'Apple Pay · Google Pay', zhHant: 'Apple Pay · Google Pay' },
  'pay.alipay': { ko: '알리페이 · 위챗페이', en: 'Alipay · WeChat Pay', ja: 'Alipay・WeChat Pay', zhHans: '支付宝 · 微信支付', zhHant: '支付寶 · 微信支付' },
  'pay.kr': { ko: '국내 카드 · 간편결제', en: 'Korean card · Kakao Pay · Naver Pay', ja: '韓国のカード・簡単決済', zhHans: '韩国银行卡 · 简易支付', zhHant: '韓國信用卡 · 簡易支付' },
  'pay.hold': { ko: '지금은 카드 승인만 걸어 두고, 탑승할 때 QR을 찍으면 결제가 확정돼요.', en: 'Your card is only authorised now — the payment completes when your QR is scanned at boarding.', ja: '今はカードの承認のみで、乗車時にQRを読み取ると決済が確定します。', zhHans: '现在仅预授权，上车扫描二维码时才扣款。', zhHant: '現在僅預授權，上車掃描QR碼時才扣款。' },
  'pay.cancelRule': { ko: '부른 뒤 2분 안에 취소하면 무료 · 이후 취소·노쇼는 수수료(안)', en: 'Free cancellation within 2 minutes · later cancellations and no-shows may be charged (draft)', ja: '呼んでから2分以内のキャンセルは無料・以降のキャンセルや不乗車は手数料（案）', zhHans: '叫车后2分钟内取消免费 · 之后取消或未乘车将收取手续费（草案）', zhHant: '叫車後2分鐘內取消免費 · 之後取消或未搭乘將收取手續費（草案）' },
  'pay.airportRule': { ko: '항공편이 늦어지면 다음 셔틀로 자동 변경 · 결항이면 자동 환불', en: 'Late flight: moved to the next shuttle automatically · cancelled flight: full refund', ja: '便が遅れたら次のシャトルへ自動変更・欠航なら自動返金', zhHans: '航班延误自动改到下一班 · 航班取消自动退款', zhHant: '航班延誤自動改到下一班 · 航班取消自動退款' },
  'pay.demo': { ko: '시연판에서는 실제 결제가 이뤄지지 않아요', en: 'Demo — no real payment is made', ja: 'デモ版のため実際の決済は行われません', zhHans: '演示版不会实际扣款', zhHant: '示範版不會實際扣款' },
  'pay.confirm.ride': { ko: '{a} 결제하고 셔틀 부르기', en: 'Pay {a} and call', ja: '{a}を支払って呼ぶ', zhHans: '支付{a}并叫车', zhHant: '支付{a}並叫車' },
  'pay.confirm.airport': { ko: '{a} 결제하고 예약', en: 'Pay {a} and book', ja: '{a}を支払って予約', zhHans: '支付{a}并预约', zhHant: '支付{a}並預約' },
  'pay.processing': { ko: '카드 승인 중…', en: 'Authorising…', ja: '承認中…', zhHans: '正在授权…', zhHant: '正在授權…' },
  'pay.close': { ko: '닫기', en: 'Close', ja: '閉じる', zhHans: '关闭', zhHant: '關閉' },

  'trips.qr': { ko: 'QR 탑승권', en: 'QR boarding pass', ja: 'QR乗車券', zhHans: '二维码乘车券', zhHant: 'QR碼乘車券' },
  'trips.qrHelp': { ko: '탑승할 때 기사님 단말기에 QR을 찍어 주세요', en: "Scan this QR at the driver's reader when you board", ja: '乗車時に運転手の端末でQRを読み取ってください', zhHans: '上车时请让司机扫描二维码', zhHant: '上車時請讓司機掃描QR碼' },
  'trips.qrBackup': { ko: 'QR이 안 되면 코드 {code} · 1회용', en: 'Backup code {code} · one-time', ja: '使えない場合はコード {code}・1回限り', zhHans: '无法扫描时出示代码 {code} · 一次性', zhHant: '無法掃描時出示代碼 {code} · 一次性' },
  'trips.pay.authorized': { ko: '카드 승인 {a} · 탑승 시 결제 확정', en: 'Card authorised {a} · charged at boarding', ja: 'カード承認 {a}・乗車時に確定', zhHans: '已预授权 {a} · 上车时扣款', zhHant: '已預授權 {a} · 上車時扣款' },
  'trips.pay.captured': { ko: '결제 완료 {a}', en: 'Paid {a}', ja: '決済済み {a}', zhHans: '已支付 {a}', zhHant: '已支付 {a}' },
  'trips.pay.released': { ko: '카드 승인 취소 (요금 없음)', en: 'Authorisation released (no charge)', ja: 'カード承認を取り消し（料金なし）', zhHans: '已撤销预授权（不收费）', zhHant: '已撤銷預授權（不收費）' },
  'trips.s.waiting': { ko: '도착 · QR을 찍고 타세요', en: 'Arrived · scan to board', ja: '到着・QRで乗車', zhHans: '已到达 · 扫码上车', zhHant: '已抵達 · 掃碼上車' },
  'trips.boarded': { ko: '{t} 탑승 확인', en: 'Boarded at {t}', ja: '{t} 乗車確認', zhHans: '{t} 已上车', zhHant: '{t} 已上車' },
  'trips.qrUsed': { ko: 'QR 확인 완료 · 1회용 탑승권 사용됨', en: 'QR checked · one-time pass used', ja: 'QR確認済み・1回限りの乗車券を使用', zhHans: '二维码已验证 · 一次性乘车券已使用', zhHant: 'QR碼已驗證 · 一次性乘車券已使用' },
  'trips.qrZoom': { ko: 'QR 크게 보기', en: 'Show QR full screen', ja: 'QRを大きく表示', zhHans: '放大二维码', zhHant: '放大QR碼' },
  'trips.demoDriver': { ko: '시연: 기사 단말기 화면에서 QR 확인하기', en: 'Demo: scan it on the driver screen', ja: 'デモ：運転手の端末画面で読み取る', zhHans: '演示：在司机端画面扫码', zhHant: '示範：在司機端畫面掃碼' },
  'toast.boarded': { ko: '탑승 확인 · {a} 결제 완료', en: 'Boarded · {a} charged', ja: '乗車確認・{a} 決済完了', zhHans: '已上车 · 已扣款 {a}', zhHant: '已上車 · 已扣款 {a}' },
  'drv.welcome': { ko: '어서 오세요! {b}까지 모셔다 드릴게요.', en: 'Welcome aboard! We will take you to {b}.', ja: 'ご乗車ありがとうございます。{b}までお送りします。', zhHans: '欢迎乘车！我们将送您到{b}。', zhHant: '歡迎搭乘！我們將送您到{b}。' },
} satisfies Record<string, L10n>;

export type Key = keyof typeof S;

export function t(key: Key, lang: Lang, vars: Record<string, string | number> = {}): string {
  let s = S[key][lang] ?? S[key].en;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** 24-hour clock from minute of day. */
export const fmtTime = (m: number): string => {
  const r = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
};

/** A duration in minutes, localised ("12 min", "12분", "12分", "12分钟"). */
export function fmtMin(m: number, lang: Lang): string {
  const n = Math.max(0, Math.round(m));
  switch (lang) {
    case 'ko': return `${n}분`;
    case 'ja': return `${n}分`;
    case 'zhHans': return `${n}分钟`;
    case 'zhHant': return `${n}分鐘`;
    default: return `${n}\u00a0min`;
  }
}

/** Hours and minutes ("2 h 50 min", "2시간 50분", …). */
export function fmtHM(m: number, lang: Lang): string {
  const n = Math.max(0, Math.round(m));
  const h = Math.floor(n / 60);
  const r = n % 60;
  if (h === 0) return fmtMin(r, lang);
  switch (lang) {
    case 'ko': return r ? `${h}시간 ${r}분` : `${h}시간`;
    case 'ja': return r ? `${h}時間${r}分` : `${h}時間`;
    case 'zhHans': return r ? `${h}小时${r}分钟` : `${h}小时`;
    case 'zhHant': return r ? `${h}小時${r}分鐘` : `${h}小時`;
    default: return r ? `${h} h ${r} min` : `${h} h`;
  }
}

export const fmtWon = (n: number): string => `₩${Math.round(n).toLocaleString('en-US')}`;
export const fmtPct = (p: number): string => `${Math.round(p * 100)}%`;
export const fmtCi = (ci: number): string => ci.toFixed(1);
