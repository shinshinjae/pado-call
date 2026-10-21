/** Places of the pilot (names in 5 languages, schematic map positions, demo crowd parameters). */
import type { DayType, ZoneId } from './scenario';

export type Lang = 'ko' | 'en' | 'ja' | 'zhHans' | 'zhHant';
export type L10n = Record<Lang, string>;

export type PlaceId =
  | 'gwangalli' | 'millak' | 'centum' | 'haeundae' | 'dongbaek' | 'blueline'
  | 'busanstn' | 'nampo' | 'gamcheon' | 'huinnyeoul' | 'taejongdae' | 'ydcruise' | 'cruise';

export type Scene = 'coast' | 'city' | 'hill';

export interface Place {
  id: PlaceId;
  zone: ZoneId;
  name: L10n;
  short: L10n; // map label
  scene: Scene; // background of the pickup photo guide
  /** schematic map position in a 360×240 box of the zone map (offline fallback) */
  x: number;
  y: number;
  /** real position of the pickup point (WGS84) */
  lat: number;
  lng: number;
  hub: boolean; // vehicles wait here
  pickup: L10n; // photo-guide text for the boarding point
  crowd?: CrowdSpec; // attraction with crowd forecast
}

export interface CrowdSpec {
  K: number; // comfortable capacity (people on site)
  T: number; // mean dwell (min)
  daily: Record<DayType, number>; // visitors per day (virtual)
  profile: Record<DayType, number[]>; // 24 hourly shares (sum 1)
  pop: number; // baseline attractiveness (choice model)
}

const h24 = (start: number, shares: number[]): number[] => {
  const a = new Array(24).fill(0);
  shares.forEach((v, i) => (a[start + i] = v));
  const s = a.reduce((x: number, y: number) => x + y, 0);
  return a.map((v: number) => v / s);
};
const same = (p: number[]): Record<DayType, number[]> => ({ weekday: p, weekend: p, cruise: p, drone: p });

const DAYTIME = h24(9, [0.07, 0.11, 0.13, 0.14, 0.14, 0.13, 0.12, 0.09, 0.07]);
const ALLDAY = h24(10, [0.04, 0.06, 0.08, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.1, 0.1, 0.08]);
const EVENING_BEACH = h24(10, [0.03, 0.04, 0.05, 0.06, 0.06, 0.07, 0.08, 0.1, 0.12, 0.13, 0.14, 0.12]);
const DRONE_BEACH = h24(10, [0.02, 0.03, 0.04, 0.05, 0.05, 0.06, 0.07, 0.09, 0.13, 0.17, 0.19, 0.1]);
const CRUISE_SPOT = h24(9, [0.09, 0.14, 0.15, 0.14, 0.13, 0.12, 0.11, 0.08, 0.04]);

export const PLACES: Place[] = [
  // ---------------------------------------------------------------- zone A
  {
    id: 'gwangalli', zone: 'A', x: 96, y: 168, lat: 35.1535, lng: 129.1186, hub: true,
    name: { ko: '광안리 해변', en: 'Gwangalli Beach', ja: '広安里ビーチ', zhHans: '广安里海滩', zhHant: '廣安里海灘' },
    short: { ko: '광안리', en: 'Gwangalli', ja: '広安里', zhHans: '广安里', zhHant: '廣安里' },
    scene: 'coast',
    pickup: { ko: '해변 중앙 광장, 파란 PADO CALL 표지판 앞', en: 'Central beach plaza, at the blue PADO CALL sign', ja: 'ビーチ中央広場、青いPADO CALLの看板前', zhHans: '海滩中央广场，蓝色 PADO CALL 标牌前', zhHant: '海灘中央廣場，藍色 PADO CALL 標牌前' },
    crowd: { K: 9000, T: 110, daily: { weekday: 19500, weekend: 30000, cruise: 22000, drone: 52000 }, profile: { weekday: EVENING_BEACH, weekend: EVENING_BEACH, cruise: EVENING_BEACH, drone: DRONE_BEACH }, pop: 1.0 },
  },
  {
    id: 'millak', zone: 'A', x: 150, y: 128, lat: 35.1552, lng: 129.1335, hub: false,
    name: { ko: '민락수변공원', en: 'Millak Waterside Park', ja: '民楽水辺公園', zhHans: '民乐水边公园', zhHant: '民樂水邊公園' },
    short: { ko: '민락', en: 'Millak', ja: '民楽', zhHans: '民乐', zhHant: '民樂' },
    scene: 'coast',
    pickup: { ko: '공원 입구 버스정류장 옆', en: 'Next to the bus stop at the park entrance', ja: '公園入口のバス停の横', zhHans: '公园入口公交站旁', zhHant: '公園入口公車站旁' },
    crowd: { K: 3200, T: 80, daily: { weekday: 5800, weekend: 9000, cruise: 6000, drone: 15000 }, profile: { weekday: EVENING_BEACH, weekend: EVENING_BEACH, cruise: EVENING_BEACH, drone: DRONE_BEACH }, pop: 0.55 },
  },
  {
    id: 'centum', zone: 'A', x: 196, y: 64, lat: 35.169, lng: 129.13, hub: false,
    name: { ko: '센텀시티', en: 'Centum City', ja: 'センタムシティ', zhHans: 'Centum City 购物区', zhHant: 'Centum City 購物區' },
    short: { ko: '센텀', en: 'Centum', ja: 'センタム', zhHans: 'Centum', zhHant: 'Centum' },
    scene: 'city',
    pickup: { ko: '백화점 정문 택시승강장 옆', en: 'Beside the taxi stand at the department store main gate', ja: '百貨店正門のタクシー乗り場の横', zhHans: '百货公司正门出租车站旁', zhHant: '百貨公司正門計程車站旁' },
    crowd: { K: 9000, T: 100, daily: { weekday: 16900, weekend: 26000, cruise: 20000, drone: 26000 }, profile: same(ALLDAY), pop: 0.8 },
  },
  {
    id: 'haeundae', zone: 'A', x: 270, y: 150, lat: 35.1592, lng: 129.1598, hub: true,
    name: { ko: '해운대 해변·호텔가', en: 'Haeundae Beach & hotels', ja: '海雲台ビーチ・ホテル街', zhHans: '海云台海滩·酒店区', zhHant: '海雲台海灘·飯店區' },
    short: { ko: '해운대', en: 'Haeundae', ja: '海雲台', zhHans: '海云台', zhHant: '海雲台' },
    scene: 'coast',
    pickup: { ko: '해변 입구 관광안내소 앞', en: 'In front of the tourist information center at the beach entrance', ja: 'ビーチ入口の観光案内所前', zhHans: '海滩入口旅游咨询处前', zhHant: '海灘入口旅遊服務中心前' },
    crowd: { K: 12000, T: 110, daily: { weekday: 23400, weekend: 36000, cruise: 28000, drone: 37000 }, profile: same(EVENING_BEACH), pop: 1.0 },
  },
  {
    id: 'dongbaek', zone: 'A', x: 236, y: 196, lat: 35.155, lng: 129.1518, hub: false,
    name: { ko: '동백섬·누리마루', en: 'Dongbaekseom (APEC House)', ja: '冬柏島・ヌリマル', zhHans: '冬柏岛·APEC世峰楼', zhHant: '冬柏島·APEC世峰樓' },
    short: { ko: '동백섬', en: 'Dongbaek', ja: '冬柏島', zhHans: '冬柏岛', zhHant: '冬柏島' },
    scene: 'coast',
    pickup: { ko: '동백섬 입구 주차장', en: 'Dongbaekseom entrance parking lot', ja: '冬柏島入口の駐車場', zhHans: '冬柏岛入口停车场', zhHant: '冬柏島入口停車場' },
    crowd: { K: 2600, T: 60, daily: { weekday: 4200, weekend: 6500, cruise: 5000, drone: 6500 }, profile: same(DAYTIME), pop: 0.45 },
  },
  {
    id: 'blueline', zone: 'A', x: 322, y: 112, lat: 35.1614, lng: 129.1694, hub: false,
    name: { ko: '블루라인파크(미포)', en: 'Blueline Park (Mipo)', ja: 'ブルーラインパーク(尾浦)', zhHans: '蓝线公园(尾浦)', zhHant: '藍線公園(尾浦)' },
    short: { ko: '블루라인', en: 'Blueline', ja: 'ブルーライン', zhHans: '蓝线公园', zhHant: '藍線公園' },
    scene: 'coast',
    pickup: { ko: '미포 정거장 매표소 앞', en: 'In front of the Mipo station ticket office', ja: '尾浦駅の切符売り場前', zhHans: '尾浦站售票处前', zhHant: '尾浦站售票處前' },
    crowd: { K: 2200, T: 60, daily: { weekday: 4600, weekend: 7000, cruise: 5000, drone: 7000 }, profile: same(DAYTIME), pop: 0.6 },
  },
  // ---------------------------------------------------------------- zone B
  {
    id: 'busanstn', zone: 'B', x: 236, y: 52, lat: 35.115, lng: 129.0425, hub: true,
    name: { ko: '부산역(KTX)', en: 'Busan Station (KTX)', ja: '釜山駅(KTX)', zhHans: '釜山站(KTX)', zhHant: '釜山站(KTX)' },
    short: { ko: '부산역', en: 'Busan Stn', ja: '釜山駅', zhHans: '釜山站', zhHant: '釜山站' },
    scene: 'city',
    pickup: { ko: '광장 동쪽 시티투어 승강장 옆', en: 'East side of the plaza, next to the city tour stop', ja: '駅前広場東側、シティツアー乗り場の横', zhHans: '站前广场东侧，城市观光巴士站旁', zhHant: '站前廣場東側，城市觀光巴士站旁' },
  },
  {
    id: 'nampo', zone: 'B', x: 160, y: 118, lat: 35.0967, lng: 129.029, hub: true,
    name: { ko: '남포·자갈치', en: 'Nampo · Jagalchi', ja: '南浦・チャガルチ', zhHans: '南浦·札嘎其', zhHant: '南浦·札嘎其' },
    short: { ko: '남포', en: 'Nampo', ja: '南浦', zhHans: '南浦', zhHant: '南浦' },
    scene: 'city',
    pickup: { ko: '자갈치역 10번 출구 앞', en: 'Jagalchi Station exit 10', ja: 'チャガルチ駅10番出口前', zhHans: '札嘎其站10号出口前', zhHant: '札嘎其站10號出口前' },
    crowd: { K: 5200, T: 90, daily: { weekday: 10400, weekend: 16000, cruise: 21000, drone: 16000 }, profile: { weekday: ALLDAY, weekend: ALLDAY, cruise: CRUISE_SPOT, drone: ALLDAY }, pop: 1.0 },
  },
  {
    id: 'gamcheon', zone: 'B', x: 54, y: 92, lat: 35.0978, lng: 129.0113, hub: false,
    name: { ko: '감천문화마을', en: 'Gamcheon Culture Village', ja: '甘川文化村', zhHans: '甘川洞文化村', zhHant: '甘川洞文化村' },
    short: { ko: '감천', en: 'Gamcheon', ja: '甘川', zhHans: '甘川', zhHant: '甘川' },
    scene: 'hill',
    pickup: { ko: '마을 입구 공영주차장(주거지 밖 승차)', en: 'Public parking at the village entrance (outside the residential area)', ja: '村入口の公営駐車場(住宅地の外で乗車)', zhHans: '村口公共停车场(在居民区外上车)', zhHant: '村口公共停車場(在住宅區外上車)' },
    crowd: { K: 1500, T: 75, daily: { weekday: 5800, weekend: 9000, cruise: 11500, drone: 9000 }, profile: { weekday: DAYTIME, weekend: DAYTIME, cruise: CRUISE_SPOT, drone: DAYTIME }, pop: 0.95 },
  },
  {
    id: 'huinnyeoul', zone: 'B', x: 168, y: 190, lat: 35.0785, lng: 129.0447, hub: true,
    name: { ko: '흰여울문화마을', en: 'Huinnyeoul Culture Village', ja: 'ヒンヨウル文化村', zhHans: '白浅滩文化村', zhHant: '白淺灘文化村' },
    short: { ko: '흰여울', en: 'Huinnyeoul', ja: 'ヒンヨウル', zhHans: '白浅滩', zhHant: '白淺灘' },
    scene: 'coast',
    pickup: { ko: '절영해안산책로 입구 안내판 앞', en: 'At the sign of the Jeolyeong coastal walk entrance', ja: '絶影海岸散策路入口の案内板前', zhHans: '绝影海岸步道入口指示牌前', zhHant: '絕影海岸步道入口指示牌前' },
    crowd: { K: 1600, T: 50, daily: { weekday: 2900, weekend: 4500, cruise: 5200, drone: 4500 }, profile: same(DAYTIME), pop: 0.6 },
  },
  {
    id: 'taejongdae', zone: 'B', x: 286, y: 212, lat: 35.0601, lng: 129.0808, hub: false,
    name: { ko: '태종대', en: 'Taejongdae', ja: '太宗台', zhHans: '太宗台', zhHant: '太宗臺' },
    short: { ko: '태종대', en: 'Taejongdae', ja: '太宗台', zhHans: '太宗台', zhHant: '太宗臺' },
    scene: 'coast',
    pickup: { ko: '태종대 입구 버스 회차지', en: 'Bus turnaround at the Taejongdae entrance', ja: '太宗台入口のバス折り返し場', zhHans: '太宗台入口公交掉头处', zhHant: '太宗臺入口公車迴轉處' },
    crowd: { K: 3500, T: 100, daily: { weekday: 3900, weekend: 6000, cruise: 7500, drone: 6000 }, profile: { weekday: DAYTIME, weekend: DAYTIME, cruise: CRUISE_SPOT, drone: DAYTIME }, pop: 0.7 },
  },
  // Large cruise ships berth at the Yeongdo terminal (Haeyang-ro 301beon-gil 17, Dongsam-dong).
  // Listed before the North Port terminal so that the extra vehicle of a cruise day waits here.
  {
    id: 'ydcruise', zone: 'B', x: 318, y: 184, lat: 35.0808, lng: 129.0792, hub: true,
    name: { ko: '부산항 국제크루즈터미널(영도)', en: 'Busan Port Cruise Terminal (Yeongdo)', ja: '釜山港国際クルーズターミナル（影島）', zhHans: '釜山港国际邮轮码头（影岛）', zhHant: '釜山港國際郵輪碼頭（影島）' },
    short: { ko: '영도 크루즈터미널', en: 'Cruise Terminal', ja: 'クルーズターミナル', zhHans: '邮轮码头', zhHant: '郵輪碼頭' },
    scene: 'coast',
    pickup: { ko: '터미널 정문 앞 관광버스 승차장 옆, 파란 PADO CALL 표지판', en: 'Tour-bus bay at the terminal main entrance, by the blue PADO CALL sign', ja: 'ターミナル正門前の観光バス乗り場の横、青いPADO CALLの看板', zhHans: '码头正门旅游巴士上车处旁，蓝色 PADO CALL 标牌', zhHant: '碼頭正門遊覽車上車處旁，藍色 PADO CALL 標牌' },
  },
  // North Port: ferries to Japan and smaller cruise ships, next to Busan Station.
  {
    id: 'cruise', zone: 'B', x: 284, y: 106, lat: 35.1189, lng: 129.0475, hub: true,
    name: { ko: '부산항 국제여객터미널(북항)', en: 'Busan Port Passenger Terminal (North Port)', ja: '釜山港国際旅客ターミナル（北港）', zhHans: '釜山港国际客运码头（北港）', zhHant: '釜山港國際客運碼頭（北港）' },
    short: { ko: '국제여객터미널', en: 'Passenger Terminal', ja: '旅客ターミナル', zhHans: '国际客运码头', zhHant: '國際客運碼頭' },
    scene: 'city',
    pickup: { ko: '터미널 1층 도착 로비 3번 게이트', en: 'Arrival lobby, 1F, gate 3', ja: 'ターミナル1階到着ロビー3番ゲート', zhHans: '码头1层到达大厅3号门', zhHant: '碼頭1樓到達大廳3號門' },
  },
];

export const placeById = (id: PlaceId): Place => PLACES.find((p) => p.id === id)!;
export const placesInZone = (z: ZoneId): Place[] => PLACES.filter((p) => p.zone === z);
export const crowdSites = (z?: ZoneId): Place[] => PLACES.filter((p) => p.crowd && (!z || p.zone === z));

/** Hotel areas served by the airport gateway (door-to-door). */
export type AreaId = 'gwangalli' | 'haeundae' | 'centum' | 'busanstn' | 'nampo' | 'yeongdo';
export interface Area {
  id: AreaId;
  zone: ZoneId;
  name: L10n;
  driveMin: number; // median drive from Gimhae airport (demo assumption)
  lat: number;
  lng: number;
}
export const AREAS: Area[] = [
  { id: 'gwangalli', zone: 'A', driveMin: 35, lat: 35.1548, lng: 129.1178, name: { ko: '광안리', en: 'Gwangalli', ja: '広安里', zhHans: '广安里', zhHant: '廣安里' } },
  { id: 'haeundae', zone: 'A', driveMin: 45, lat: 35.1612, lng: 129.1602, name: { ko: '해운대', en: 'Haeundae', ja: '海雲台', zhHans: '海云台', zhHant: '海雲台' } },
  { id: 'centum', zone: 'A', driveMin: 40, lat: 35.1702, lng: 129.1312, name: { ko: '센텀', en: 'Centum', ja: 'センタム', zhHans: 'Centum', zhHant: 'Centum' } },
  { id: 'busanstn', zone: 'B', driveMin: 30, lat: 35.1148, lng: 129.0408, name: { ko: '부산역', en: 'Busan Station', ja: '釜山駅', zhHans: '釜山站', zhHant: '釜山站' } },
  { id: 'nampo', zone: 'B', driveMin: 33, lat: 35.0986, lng: 129.0302, name: { ko: '남포', en: 'Nampo', ja: '南浦', zhHans: '南浦', zhHant: '南浦' } },
  { id: 'yeongdo', zone: 'B', driveMin: 38, lat: 35.088, lng: 129.047, name: { ko: '영도', en: 'Yeongdo', ja: '影島', zhHans: '影岛', zhHant: '影島' } },
];
export const areaById = (id: AreaId): Area => AREAS.find((a) => a.id === id)!;

/** Gimhae International Airport, international terminal (approximate). */
export const AIRPORT = { lat: 35.1733, lng: 128.9467 };

/** Service areas of the two zones (approximate polygons, [lng, lat]). */
export const ZONE_POLYGONS: Record<ZoneId, [number, number][]> = {
  A: [
    [129.1095, 35.149], [129.1095, 35.162], [129.12, 35.1745], [129.135, 35.177], [129.156, 35.17],
    [129.176, 35.166], [129.1765, 35.1575], [129.16, 35.1505], [129.14, 35.147], [129.12, 35.146], [129.1095, 35.149],
  ],
  B: [
    [129.004, 35.093], [129.005, 35.104], [129.03, 35.125], [129.053, 35.126], [129.056, 35.11], [129.07, 35.09],
    [129.083, 35.0845], [129.088, 35.077], [129.089, 35.064], [129.086, 35.054], [129.07, 35.056], [129.04, 35.072], [129.025, 35.088], [129.004, 35.093],
  ],
};

/** Great-circle distance in km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
