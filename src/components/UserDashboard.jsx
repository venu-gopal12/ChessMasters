// Purpose: React UI component for the User Dashboard experience.
import React from 'react';

const UserDashboard = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-page via-brand-pageAlt to-black text-brand-ink">
            <header className="bg-brand-surface shadow-md px-4 sm:px-6 md:px-8 py-4 sm:py-6">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-ink">
                    User Profile
                </h1>
            </header>

            <nav className="bg-brand-surfaceAlt text-white px-4 sm:px-6 md:px-8 py-3">
                <ul className="flex flex-wrap justify-center sm:justify-start space-x-4 sm:space-x-6 md:space-x-8">
                    <li className="cursor-pointer hover:text-brand-accent transition-colors duration-200 text-sm sm:text-base">
                        Profile
                    </li>
                    <li className="cursor-pointer hover:text-brand-accent transition-colors duration-200 text-sm sm:text-base">
                        Games
                    </li>
                    <li className="cursor-pointer hover:text-brand-accent transition-colors duration-200 text-sm sm:text-base">
                        Statistics
                    </li>
                    <li className="cursor-pointer hover:text-brand-accent transition-colors duration-200 text-sm sm:text-base">
                        Settings
                    </li>
                </ul>
            </nav>

            <main className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                <section className="bg-brand-surface rounded-lg shadow-md p-4 sm:p-6 md:p-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-brand-ink mb-4">
                        Profile Information
                    </h2>
                    <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                        <p className="flex flex-col sm:flex-row sm:items-center">
                            <span className="font-semibold text-brand-muted sm:w-32">Username:</span>
                            <span className="text-brand-ink">ChessMaster123</span>
                        </p>
                        <p className="flex flex-col sm:flex-row sm:items-center">
                            <span className="font-semibold text-brand-muted sm:w-32">Rating:</span>
                            <span className="text-brand-ink">1850</span>
                        </p>
                        <p className="flex flex-col sm:flex-row sm:items-center">
                            <span className="font-semibold text-brand-muted sm:w-32">Country:</span>
                            <span className="text-brand-ink">United States</span>
                        </p>
                    </div>
                </section>

                <section className="bg-brand-surface rounded-lg shadow-md p-4 sm:p-6 md:p-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-brand-ink mb-4">
                        Recent Games
                    </h2>
                    <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                        <li className="p-2 sm:p-3 bg-brand-surfaceAlt rounded-lg hover:bg-brand-accentSoft transition-colors duration-200">
                            Win vs. TheKing (ELO: 1780)
                        </li>
                        <li className="p-2 sm:p-3 bg-brand-surfaceAlt rounded-lg hover:bg-brand-accentSoft transition-colors duration-200">
                            Loss vs. QueenBee (ELO: 1900)
                        </li>
                        <li className="p-2 sm:p-3 bg-brand-surfaceAlt rounded-lg hover:bg-brand-accentSoft transition-colors duration-200">
                            Draw vs. KnightRider (ELO: 1830)
                        </li>
                    </ul>
                </section>

                <section className="bg-brand-surface rounded-lg shadow-md p-4 sm:p-6 md:p-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-brand-ink mb-4">
                        Statistics
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm sm:text-base">
                        <div className="bg-brand-surfaceAlt p-3 sm:p-4 rounded-lg">
                            <p className="font-semibold text-brand-muted">Total Games</p>
                            <p className="text-2xl sm:text-3xl font-bold text-brand-accent">120</p>
                        </div>
                        <div className="bg-brand-surfaceAlt p-3 sm:p-4 rounded-lg">
                            <p className="font-semibold text-brand-muted">Wins</p>
                            <p className="text-2xl sm:text-3xl font-bold text-brand-success">75</p>
                        </div>
                        <div className="bg-brand-surfaceAlt p-3 sm:p-4 rounded-lg">
                            <p className="font-semibold text-brand-muted">Losses</p>
                            <p className="text-2xl sm:text-3xl font-bold text-red-600">30</p>
                        </div>
                        <div className="bg-brand-surfaceAlt p-3 sm:p-4 rounded-lg">
                            <p className="font-semibold text-brand-muted">Draws</p>
                            <p className="text-2xl sm:text-3xl font-bold text-yellow-600">15</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-brand-surfaceAlt text-white px-4 sm:px-6 md:px-8 py-4 text-center text-sm sm:text-base">
                <p>Chess Website © 2024</p>
            </footer>
        </div>
    );
};

export default UserDashboard;





