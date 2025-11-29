'use client';

import Admin from '../../components/layout/Admin';
import MemberDirectory from '../../modules/members/components/MemberDirectory';
import { withAuth } from '../../utils/withAuth';

function MembersPage() {
  return (
    <Admin>
      <MemberDirectory />
    </Admin>
  );
}

export default withAuth(MembersPage);
