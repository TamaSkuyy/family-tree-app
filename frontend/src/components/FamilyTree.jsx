import React, { useState, useEffect } from "react";
import { personAPI, relationshipAPI } from "../services/api";
import { ArrowLeft, Link2, Heart, User, Users } from "lucide-react";

const FamilyTree = ({ personId }) => {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);

  useEffect(() => {
    if (personId) {
      fetchFamilyTree(personId);
    }
  }, [personId]);

  const fetchFamilyTree = async (id) => {
    try {
      const response = await personAPI.getFamilyTree(id);
      setTreeData(response.data.data);
      setSelectedPerson(response.data.data);
    } catch (error) {
      console.error("Error fetching family tree:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRelationship = async (type, person1Id, person2Id) => {
    try {
      if (type === "parent-child") {
        await relationshipAPI.addParentChild(person1Id, person2Id);
      } else if (type === "spouse") {
        await relationshipAPI.addSpouse(person1Id, person2Id);
      }
      fetchFamilyTree(personId);
    } catch (error) {
      console.error("Error adding relationship:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        Loading family tree...
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="text-center py-12 text-gray-500">
        No family tree data found
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => (window.location.href = "/")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </button>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-8 h-8" />
          Family Tree
        </h1>
      </div>

      {/* Selected Person Details */}
      {selectedPerson && (
        <section aria-labelledby="selected-person" className="mb-6">
          <h2 id="selected-person" className="sr-only">
            Selected person
          </h2>
          <div className="card bg-base-100 shadow mb-6">
            <div className="card-body flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {selectedPerson.first_name} {selectedPerson.last_name}
                </h2>
                <div className="flex gap-3 items-center text-sm text-gray-600">
                  <span
                    className={`badge ${
                      selectedPerson.gender === "male"
                        ? "badge-info"
                        : "badge-secondary"
                    }`}
                  >
                    {selectedPerson.gender}
                  </span>
                  {selectedPerson.birth_date && (
                    <span>
                      Born:{" "}
                      {new Date(selectedPerson.birth_date).toLocaleDateString()}
                    </span>
                  )}
                  {selectedPerson.death_date && (
                    <span>
                      Died:{" "}
                      {new Date(selectedPerson.death_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="card-actions">
                <button
                  onClick={() => setShowRelationshipForm(true)}
                  className="btn btn-success"
                >
                  <Link2 className="w-4 h-4" />
                  Add Relationship
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Family Tree Visualization */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Family Relationships</h3>

        {/* Parents */}
        <section aria-labelledby="parents" className="mb-6">
          <h4
            id="parents"
            className="font-medium text-gray-700 mb-2 flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Parents
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPerson?.parent_relationships?.map((rel) => (
              <PersonCard
                key={rel.parent.id}
                person={rel.parent}
                onClick={() => fetchFamilyTree(rel.parent.id)}
              />
            ))}
            {(!selectedPerson?.parent_relationships ||
              selectedPerson.parent_relationships.length === 0) && (
              <div className="text-gray-500 italic">No parents recorded</div>
            )}
          </div>
        </section>

        {/* Spouses */}
        <section aria-labelledby="spouses" className="mb-6">
          <h4
            id="spouses"
            className="font-medium text-gray-700 mb-2 flex items-center gap-2"
          >
            <Heart className="w-4 h-4" />
            Spouses
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPerson?.spouse_relationships?.map((rel) => (
              <PersonCard
                key={rel.person2.id}
                person={rel.person2}
                onClick={() => fetchFamilyTree(rel.person2.id)}
              />
            ))}
            {(!selectedPerson?.spouse_relationships ||
              selectedPerson.spouse_relationships.length === 0) && (
              <div className="text-gray-500 italic">No spouses recorded</div>
            )}
          </div>
        </section>

        {/* Children */}
        <section aria-labelledby="children" className="mb-6">
          <h4
            id="children"
            className="font-medium text-gray-700 mb-2 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Children
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedPerson?.child_relationships?.map((rel) => (
              <PersonCard
                key={rel.child.id}
                person={rel.child}
                onClick={() => fetchFamilyTree(rel.child.id)}
              />
            ))}
            {(!selectedPerson?.child_relationships ||
              selectedPerson.child_relationships.length === 0) && (
              <div className="text-gray-500 italic">No children recorded</div>
            )}
          </div>
        </section>
      </div>

      {/* Relationship Form Modal */}
      {showRelationshipForm && (
        <RelationshipForm
          currentPerson={selectedPerson}
          onClose={() => setShowRelationshipForm(false)}
          onAddRelationship={handleAddRelationship}
        />
      )}
    </div>
  );
};

const PersonCard = ({ person, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="card card-compact bg-base-100 shadow-sm cursor-pointer hover:shadow-md"
    >
      <div className="card-body">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              person.gender === "male" ? "bg-blue-100" : "bg-pink-100"
            }`}
          >
            <User
              className={`w-5 h-5 ${
                person.gender === "male" ? "text-blue-600" : "text-pink-600"
              }`}
            />
          </div>
          <div>
            <h5 className="font-medium">
              {person.first_name} {person.last_name}
            </h5>
            {person.birth_date && (
              <p className="text-sm text-gray-600">
                {new Date(person.birth_date).getFullYear()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const RelationshipForm = ({ currentPerson, onClose, onAddRelationship }) => {
  const [allPersons, setAllPersons] = useState([]);
  const [formData, setFormData] = useState({
    type: "parent-child",
    relatedPersonId: "",
  });

  useEffect(() => {
    const fetchAllPersons = async () => {
      try {
        const response = await personAPI.getAll();
        setAllPersons(
          response.data.data.filter((p) => p.id !== currentPerson.id)
        );
      } catch (error) {
        console.error("Error fetching persons:", error);
      }
    };

    fetchAllPersons();
  }, [currentPerson]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.type === "parent-child") {
      // This is simplified - in a real app you'd want to specify who is parent/child
      onAddRelationship(
        "parent-child",
        currentPerson.id,
        formData.relatedPersonId
      );
    } else if (formData.type === "spouse") {
      onAddRelationship("spouse", currentPerson.id, formData.relatedPersonId);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Relationship</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Relationship Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="parent-child">Parent-Child</option>
              <option value="spouse">Spouse</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Related Person
            </label>
            <select
              value={formData.relatedPersonId}
              onChange={(e) =>
                setFormData({ ...formData, relatedPersonId: e.target.value })
              }
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Select a person...</option>
              {allPersons.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.first_name} {person.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Add Relationship
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FamilyTree;
