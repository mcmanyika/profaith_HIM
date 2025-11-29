'use client';

import Admin from '../../components/layout/Admin';
import GroupList from '../../modules/groups/components/GroupList';
import { withAuth } from '../../utils/withAuth';

function GroupsPage() {
  return (
    <Admin>
      <GroupList />
    </Admin>
  );
}

export default withAuth(GroupsPage);

