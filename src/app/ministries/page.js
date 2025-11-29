'use client';

import Admin from '../../components/layout/Admin';
import MinistryList from '../../modules/ministries/components/MinistryList';
import { withAuth } from '../../utils/withAuth';

function MinistriesPage() {
  return (
    <Admin>
      <MinistryList />
    </Admin>
  );
}

export default withAuth(MinistriesPage);

