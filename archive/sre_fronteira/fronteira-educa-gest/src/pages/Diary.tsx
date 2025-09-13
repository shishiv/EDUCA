import MainLayout from '@/components/Layout/MainLayout';
import { DiaryCalendar } from '@/components/diary/DiaryCalendar';

const Diary = () => {
  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Diário de Classe</h1>
        <DiaryCalendar />
      </div>
    </MainLayout>
  );
};

export default Diary;
