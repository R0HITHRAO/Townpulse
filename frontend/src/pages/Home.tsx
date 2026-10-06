import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThreeCanvas } from '../components/ThreeCanvas';
import { IntroScreen } from '../components/IntroScreen';
import { SearchBar } from '../components/SearchBar';
import { api, Category, Listing } from '../services/api';
import { searchSnapshot, loadSnapshotCategories } from '../services/directoryFallback';
import { MapPin, ArrowRight, Compass, ShieldCheck } from 'lucide-react';

export const Home: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [introFinished, setIntroFinished] = useState(false);

  useEffect(() => {
    api.getCategories()
      .then(setCategories)
      .catch(async () => {
        const snap = await loadSnapshotCategories();
        setCategories(snap);
      });

    api.searchListings({ page: 1, per_page: 6 })
      .then(res => setListings(res.items))
      .catch(async () => {
        const snap = await searchSnapshot({ page: 1, per_page: 6 });
        setListings(snap.items);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-black text-white overflow-hidden min-h-screen font-sans">
      {!introFinished && (
        <IntroScreen onEnter={() => setIntroFinished(true)} />
      )}

      {/* Main 3D Experience (only fully active/visible after intro) */}
      <div 
        className={`transition-opacity duration-1000 ${introFinished ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <ThreeCanvas>
          {/* Section 1: Hero */}
          <div className="w-screen h-screen flex flex-col justify-center px-10 md:px-32 pointer-events-none">
            <div className="pointer-events-auto max-w-2xl">
              <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-white mb-6 drop-shadow-2xl mix-blend-difference">
                TownPulse
              </h1>
              <p className="text-xl md:text-2xl text-white/80 max-w-2xl mb-10 font-light mix-blend-difference">
                Immersive directory experience. Scroll to dive into the city.
              </p>
              <div className="max-w-xl backdrop-blur-xl bg-black/20 p-2 rounded-3xl border border-white/20 shadow-2xl">
                 <SearchBar onSearch={() => {}} />
              </div>
            </div>
          </div>

          {/* Section 2: Categories */}
          <div className="w-screen h-screen flex flex-col justify-center items-end px-10 md:px-32 pointer-events-none">
            <div className="pointer-events-auto max-w-3xl text-right">
              <h2 className="text-5xl md:text-7xl font-bold mb-8 flex items-center justify-end gap-4 text-white drop-shadow-lg">
                Discover <Compass className="w-16 h-16 text-orange-500" />
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categories.slice(0, 6).map(c => (
                  <div key={c.id} className="group relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/20 p-6 rounded-2xl transition-all hover:scale-105 cursor-pointer backdrop-blur-lg">
                    <div className="text-4xl mb-4 transform group-hover:scale-110 transition">{c.icon}</div>
                    <h3 className="text-xl font-semibold">{c.name}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Featured Listings */}
          <div className="w-screen h-screen flex flex-col justify-center px-10 md:px-32 pointer-events-none">
            <div className="pointer-events-auto max-w-2xl text-left">
              <h2 className="text-5xl md:text-7xl font-bold mb-8 flex items-center gap-4 text-white drop-shadow-lg">
                <ShieldCheck className="w-16 h-16 text-emerald-500" /> Top Rated
              </h2>
              <div className="space-y-4">
                {loading ? (
                   <div className="text-white/50">Loading flagship listings...</div>
                ) : listings.map(l => (
                  <Link key={l.id} to={`/listings/${l.id}`} className="block bg-black/40 backdrop-blur-md border border-white/20 p-6 rounded-2xl hover:bg-white/10 transition-colors text-left flex items-center gap-4 group hover:scale-[1.02] transform duration-300">
                    <div className="w-16 h-16 bg-white/10 rounded-xl overflow-hidden flex-shrink-0">
                      {l.image_url ? (
                        <img src={l.image_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">{l.category?.icon || '📍'}</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold group-hover:text-orange-400 transition">{l.name}</h3>
                      <p className="text-sm text-white/60 line-clamp-1">{l.address}</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-white/40 group-hover:text-white transition group-hover:translate-x-2" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Call to Action */}
          <div className="w-screen h-screen flex flex-col items-center justify-center pointer-events-none px-4 text-center">
            <div className="pointer-events-auto max-w-3xl">
               <h2 className="text-6xl md:text-8xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 drop-shadow-2xl">
                 Join the City
               </h2>
               <Link to="/submit" className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full text-xl font-bold hover:scale-105 transition hover:shadow-[0_0_60px_rgba(255,255,255,0.6)]">
                 <MapPin />
                 Submit a Listing
               </Link>
            </div>
          </div>
        </ThreeCanvas>
      </div>
    </div>
  );
};
