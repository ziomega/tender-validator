import { supabase } from "@/lib/supabase"
import AddProject from "@/components/AddProject"

export default async function Home() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")

  if (error) {
    return <div>Error fetching data</div>
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Projects</h1>

      <AddProject /> {/* ✅ ADD THIS */}

      {data?.length === 0 && <p>No projects found</p>}

      {data?.map((project) => (
        <div
          key={project.id}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "8px",
          }}
        >
          <h2>{project.name}</h2>
          <p>ID: {project.id}</p>
        </div>
      ))}
    </div>
  )
}