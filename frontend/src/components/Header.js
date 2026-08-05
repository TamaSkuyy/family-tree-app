import React from 'react';
import { Users, Github } from 'lucide-react';

const Header = () => {
    return (
        <header className="bg-base-100 shadow-sm">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="avatar">
                        <div className="w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Family Tree</h1>
                        <p className="text-xs text-gray-500">Visualize relationships & manage members</p>
                    </div>
                </div>

                <nav className="flex items-center gap-3 text-sm">
                    <a className="btn btn-ghost btn-sm" href="/">Members</a>
                    <button className="btn btn-ghost btn-sm" onClick={() => { }} aria-label="About">About</button>
                    <a className="btn btn-ghost btn-sm inline-flex items-center gap-2" href="https://github.com/">
                        <Github className="w-4 h-4" />
                        Repo
                    </a>
                </nav>
            </div>
        </header>
    );
};

export default Header;
