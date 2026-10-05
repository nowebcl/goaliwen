import React from 'react';
import { BookingProvider, useBooking } from './context/BookingContext';
import { BookingScreen } from './components/public/BookingScreen';
import { AdminScreen } from './components/admin/AdminScreen';
import { WebpayModal } from './components/public/WebpayModal';

const AppContent: React.FC = () => {
  const { currentRoute } = useBooking();

  return (
    <>
      {currentRoute === 'admin' ? <AdminScreen /> : <BookingScreen />}
      <WebpayModal />
    </>
  );
};

export function App() {
  return (
    <BookingProvider>
      <AppContent />
    </BookingProvider>
  );
}

export default App;
