"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function AddProject() {
  const [name, setName] = useState("")

  const addProject = async () => {
    const { error } = await supabase.from("projects").insert([
      { name }
    ])

    if (error) {
      console.log(error)
      alert("Error adding project")
    } else {
      alert("Project added!")
      location.reload()
    }
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name"
      />
      <button onClick={addProject}>Add</button>
    </div>
  )
}