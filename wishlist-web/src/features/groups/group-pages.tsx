import { Link, useParams } from 'react-router-dom'

export function GroupsPage() {
  return <h1 className="text-xl font-semibold">Groups</h1>
}

export function GroupPage() {
  const { groupId } = useParams()

  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Group {groupId}</h1>
      <Link className="underline underline-offset-4" to="/groups">
        Back to groups
      </Link>
    </>
  )
}
