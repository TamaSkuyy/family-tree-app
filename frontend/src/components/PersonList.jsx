import React, { useState, useEffect } from "react";
import { personAPI } from "../services/api";
import { Search, Plus, Edit2, Trash2, Users, TreePine } from "lucide-react";

const PersonList = () => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const response = await personAPI.getAll();
      setPersons(response.data.data);
    } catch (error) {
      console.error("Error fetching persons:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPersons();
      return;
    }

    try {
      const response = await personAPI.search(searchQuery);
      setPersons(response.data.data);
    } catch (error) {
      console.error("Error searching persons:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this person?")) {
      try {
        await personAPI.delete(id);
        fetchPersons();
      } catch (error) {
        console.error("Error deleting person:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <section aria-labelledby="members-title" className="mb-6">
        <div className="flex justify-between items-center">
          <h1
            id="members-title"
            className="text-3xl font-bold text-gray-800 flex items-center gap-2"
          >
            <Users className="w-8 h-8" />
            Family Members
          </h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary flex items-center gap-2"
              aria-label="Add person"
            >
              <Plus className="w-4 h-4" />
              Add Person
            </button>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="mb-6 flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="input input-bordered w-full pl-10 pr-4 py-2"
          />
        </div>
        <button onClick={handleSearch} className="btn">
          Search
        </button>
        <button
          onClick={() => {
            setSearchQuery("");
            fetchPersons();
          }}
          className="btn btn-ghost"
        >
          Clear
        </button>
      </div>

      {/* Person Grid */}
      <section aria-labelledby="person-grid" className="">
        <div id="person-grid" className="sr-only">
          Person list
        </div>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          role="list"
        >
          {persons.map((person) => {
            const initials = `${person.first_name?.[0] || ""}${
              person.last_name?.[0] || ""
            }`.toUpperCase();
            const bgColor =
              person.gender === "male"
                ? "from-blue-400 to-blue-600"
                : "from-pink-400 to-pink-600";
            return (
              <div
                key={person.id}
                className="card bg-base-100 shadow hover:shadow-lg transition-shadow"
                role="listitem"
              >
                <div className="card-body">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`avatar placeholder`}>
                        <div
                          className={`bg-gradient-to-br ${bgColor} w-12 rounded-full flex items-center justify-center text-white text-sm font-semibold`}
                        >
                          {initials}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {person.first_name} {person.last_name}
                        </h3>
                        <span
                          className={`badge badge-sm ${
                            person.gender === "male"
                              ? "badge-info"
                              : "badge-accent"
                          }`}
                        >
                          {person.gender}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingPerson(person)}
                        className="btn btn-ghost btn-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(person.id)}
                        className="btn btn-ghost btn-sm text-error"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    {person.birth_date && (
                      <p>
                        Born: {new Date(person.birth_date).toLocaleDateString()}
                      </p>
                    )}
                    {person.death_date && (
                      <p>
                        Died: {new Date(person.death_date).toLocaleDateString()}
                      </p>
                    )}
                    {person.email && <p>{person.email}</p>}
                    {person.phone && <p>{person.phone}</p>}
                  </div>

                  <div className="card-actions justify-end mt-3">
                    <button
                      onClick={() =>
                        (window.location.href = `/family-tree/${person.id}`)
                      }
                      className="btn btn-outline btn-sm"
                    >
                      <TreePine className="w-4 h-4" />
                      View Tree
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {persons.length === 0 && (
        <div className="text-center py-12 text-gray-500" role="status">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No family members found</p>
        </div>
      )}

      {/* Add/Edit Person Modal */}
      {(showAddForm || editingPerson) && (
        <PersonForm
          person={editingPerson}
          onClose={() => {
            setShowAddForm(false);
            setEditingPerson(null);
          }}
          onSave={fetchPersons}
        />
      )}
    </div>
  );
};

export default PersonList;
