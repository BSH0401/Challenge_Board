import { makeDemoData } from './demo-data.js';

const KEY = 'cb-demo-v1';

// 체험 모드 저장소: 이 브라우저의 localStorage에만 저장한다. Firebase에는 아무것도 보내지 않는다.
// owner 저장소(firebase.js)와 같은 함수 이름을 쓴다.
export function createDemoStore(today) {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { data = null; }
  if (!data || !data.days) data = makeDemoData(today);
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 저장 불가: 메모리에서만 동작 */ } };
  persist();

  return {
    kind: 'demo',
    async load() { return structuredClone(data); },
    async saveDay(key, record) { data.days[key] = { ...record }; persist(); },
    async saveMission(mission) {
      const i = data.missions.findIndex((m) => m.id === mission.id);
      if (i >= 0) data.missions[i] = { ...mission }; else data.missions.push({ ...mission });
      persist();
    },
    async deleteMission(id) { data.missions = data.missions.filter((m) => m.id !== id); persist(); },
    async saveSeasons(seasons) { data.seasons = structuredClone(seasons); persist(); },
    reset() { data = makeDemoData(today); persist(); },
    destroy() { try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } },
  };
}
