import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft, Link2, Heart, User, Users, UserPlus, ChevronRight,
  Cake, Loader2,
} from "lucide-react";
import { personAPI, relationshipAPI } from "../services/api";
import toast from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════════════
// PERSON CARD (light, clickable)
// ═══════════════════════════════════════════════════════════════════════
function PersonCard({ person, onClick }) {
  const genderColor =
    person.gender === "male"
      ? { bg: "bg-blue-50", icon: "text-blue-600", badge: "bg-blue-50 text-blue-700" }
      : { bg: "bg-pink-50", icon: "text-pink-600", badge: "bg-pink-50 text-pink-700" };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-slate-50 hover:bg-white border border-slate-200 rounded-xl p-4
        flex items-center gap-3 hover:shadow-md hover:border-slate-300
        transition-all cursor-pointer group"
    >
      <div className={`w-10 h-10 rounded-full ${genderColor.bg} flex items-center justify-center flex-shrink-0`}>
        <User className={`w-5 h-5 ${genderColor.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">
          {person.first_name} {person.last_name}
        </p>
        {person.birth_date && (
          <p className="text-xs text-slate-500">
            {new Date(person.birth_date).getFullYear()}
            {person.death_date && ` – ${new Date(person.death_date).getFullYear()}`}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0 transition-colors" />
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════
function EmptyState({ icon: Icon, label, subtext, onAdd }) {
  return (
    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center">
      <div className="p-2.5 bg-slate-100 rounded-full mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-slate-600 font-medium text-sm">{label}</p>
      <p className="text-slate-400 text-xs mt-1">{subtext}</p>
      {onAdd && (
        <button onClick={onAdd} className="mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          + Add
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RELATIONSHIP FORM MODAL
// ═══════════════════════════════════════════════════════════════════════
function RelationshipForm({ currentPerson, onClose, onAddRelationship }) {
  const [allPersons, setAllPersons] = useState([]);
  const [formData, setFormData] = useState({ type: "parent-child", relatedPersonId: "" });

  useEffect(() => {
    personAPI.getAll().then((r) => {
      setAllPersons((r?.data?.data || []).filter((p) => p.id !== currentPerson.id));
    }).catch(() => {});
  }, [currentPerson]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.relatedPersonId) return;
    if (formData.type === "parent-child") {
      onAddRelationship("parent-child", currentPerson.id, formData.relatedPersonId);
    } else if (formData.type === "spouse") {
      onAddRelationship("spouse", currentPerson.id, formData.relatedPersonId);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" style={{ animation: "fadeInUp 0.3s ease both" }}>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Add Relationship</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Relationship Type</label>
            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 px-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all">
              <option value="parent-child">Parent-Child</option>
              <option value="spouse">Spouse</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Related Person</label>
            <select value={formData.relatedPersonId} onChange={(e) => setFormData({ ...formData, relatedPersonId: e.target.value })}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 px-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all" required>
              <option value="">Select a person...</option>
              {allPersons.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all">
              Add Relationship
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
export default function FamilyTree({ personId }) {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showRelationshipForm, setShowRelationshipForm] = useState(false);

  const fetchFamilyTree = async (id) => {
    setLoading(true);
    try {
      const response = await personAPI.getFamilyTree(id);
      setTreeData(response.data.data);
      setSelectedPerson(response.data.data);
    } catch (err) {
      toast.error("Failed to load family tree");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (personId) fetchFamilyTree(personId);
  }, [personId]);

  const handleAddRelationship = async (type, person1Id, person2Id) => {
    try {
      if (type === "parent-child") {
        await relationshipAPI.addParentChild(person1Id, person2Id);
      } else if (type === "spouse") {
        await relationshipAPI.addSpouse(person1Id, person2Id);
      }
      toast.success("Relationship added");
      setShowRelationshipForm(false);
      fetchFamilyTree(personId);
    } catch (err) {
      toast.error("Failed to add relationship");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No family tree data found</h3>
        <Link to="/" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">Back to members</Link>
      </div>
    );
  }

  const genderCfg =
    selectedPerson?.gender === "male"
      ? { bg: "from-blue-500 to-blue-600", badge: "bg-blue-50 text-blue-700 border-blue-200", icon: "♂" }
      : { bg: "from-pink-500 to-rose-500", badge: "bg-pink-50 text-pink-700 border-pink-200", icon: "♀" };

  const initials = `${selectedPerson?.first_name?.charAt(0) || ""}${selectedPerson?.last_name?.charAt(0) || ""}`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Breadcrumb + Title */}
        <div className="space-y-1">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Members
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Users className="w-7 h-7 text-emerald-600" />
            </div>
            Family Tree
          </h1>
        </div>

        {/* Profile Hero Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8
            flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br ${genderCfg.bg}
            border-4 border-white shadow-lg flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0`}>
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">
              {selectedPerson?.first_name} {selectedPerson?.last_name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${genderCfg.badge}`}>
                {genderCfg.icon} {selectedPerson?.gender === "male" ? "Male" : "Female"}
              </span>
              {selectedPerson?.birth_date && (
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Cake className="w-4 h-4 text-slate-400" />
                  Born {new Date(selectedPerson.birth_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  {selectedPerson?.death_date && ` — Died ${new Date(selectedPerson.death_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
                </span>
              )}
            </div>
          </div>

          {/* Action */}
          <button
            onClick={() => setShowRelationshipForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white
              bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20
              transition-all duration-200 flex-shrink-0"
          >
            <Link2 className="w-4 h-4" /> Add Relationship
          </button>
        </motion.div>

        {/* Family Relationships */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8">
          <h2 className="text-xl font-bold text-slate-900">Family Relationships</h2>

          {/* Parents */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wider">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              Parents
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">
                {selectedPerson?.parents?.length || 0}
              </span>
            </h3>
            {selectedPerson?.parents?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedPerson.parents.map((person) => (
                  <PersonCard key={person.id} person={person} onClick={() => fetchFamilyTree(person.id)} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} label="No parents recorded" subtext="Add a parent relationship to see it here" onAdd={() => setShowRelationshipForm(true)} />
            )}
          </section>

          {/* Spouses */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wider">
              <div className="p-1.5 bg-pink-50 rounded-lg">
                <Heart className="w-4 h-4 text-pink-600" />
              </div>
              Spouses
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">
                {selectedPerson?.spouses?.length || 0}
              </span>
            </h3>
            {selectedPerson?.spouses?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedPerson.spouses.map((person) => (
                  <PersonCard key={person.id} person={person} onClick={() => fetchFamilyTree(person.id)} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Heart} label="No spouses recorded" subtext="Add a spouse relationship to see it here" onAdd={() => setShowRelationshipForm(true)} />
            )}
          </section>

          {/* Children */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wider">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <UserPlus className="w-4 h-4 text-emerald-600" />
              </div>
              Children
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">
                {selectedPerson?.children?.length || 0}
              </span>
            </h3>
            {selectedPerson?.children?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedPerson.children.map((person) => (
                  <PersonCard key={person.id} person={person} onClick={() => fetchFamilyTree(person.id)} />
                ))}
              </div>
            ) : (
              <EmptyState icon={UserPlus} label="No children recorded" subtext="Add a child relationship to see it here" onAdd={() => setShowRelationshipForm(true)} />
            )}
          </section>
        </motion.div>
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
}
