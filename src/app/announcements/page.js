'use client';

import Admin from '../../components/layout/Admin';
import AnnouncementBoard from '../../modules/communication/components/AnnouncementBoard';
import { withAuth } from '../../utils/withAuth';

function AnnouncementsPage() {
  return (
    <Admin>
      <AnnouncementBoard />
    </Admin>
  );
}

export default withAuth(AnnouncementsPage);

