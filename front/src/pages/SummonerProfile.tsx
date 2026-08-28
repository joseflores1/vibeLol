import { useParams, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Loading } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ProfileIcon } from "../components/ProfileIcon";
import { RankedBadge } from "../components/RankedBadge";
import { MasteryGrid } from "../components/MasteryGrid";
import { RegionPill } from "../components/RegionPill";
import { MatchHistory } from "../components/MatchHistory";
import { type MatchTab } from "../components/Tabs";
import {
  useSummonerProfile,
  useLeagueByRiotId,
  useMasteryByRiotId,
  useStaticVersion,
  useStaticChampions,
  useStaticSpells,
  useStaticRunes,
} from "../hooks/useApi";
import { assertRegion } from "../constants/regions";
import type { Champion, Spell, Rune } from "../types/api";
import "./SummonerProfile.css";

export function SummonerProfilePage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const gameName = params.gameName ?? "";
  const tagLine = params.tagLine ?? "";
  const region = assertRegion(searchParams.get("region"));
  const [activeTab, setActiveTab] = useState<MatchTab>("all");

  const profile = useSummonerProfile(gameName, tagLine, region);
  const league = useLeagueByRiotId(gameName, tagLine, region);
  const mastery = useMasteryByRiotId(gameName, tagLine, region);
  const staticVersion = useStaticVersion();
  const staticChampions = useStaticChampions();
  const staticSpells = useStaticSpells();
  const staticRunes = useStaticRunes();

  const championMap = useMemo(() => {
    const m = new Map<number, Champion>();
    if (staticChampions.data) {
      for (const c of staticChampions.data.champions) m.set(c.key, c);
    }
    return m;
  }, [staticChampions.data]);

  const spellMap = useMemo(() => {
    const m = new Map<number, Spell>();
    for (const s of staticSpells.data?.spells ?? []) m.set(s.key, s);
    return m;
  }, [staticSpells.data]);

  const runeMap = useMemo(() => {
    const m = new Map<number, Rune>();
    for (const r of staticRunes.data?.runes ?? []) m.set(r.id, r);
    return m;
  }, [staticRunes.data]);

  const version = staticVersion.data?.version ?? "";

  return (
    <>
      <Nav initialGameName={gameName} initialTagLine={tagLine} initialRegion={region} />

      <div className="profile-page">
        {profile.isLoading && <Loading label="Loading summoner" />}
        {profile.isError && (
          <ErrorState
            title="Couldn't load this summoner"
            message={(profile.error as { message?: string })?.message ?? "Unknown error."}
            status={(profile.error as { status?: number })?.status}
            onRetry={() => profile.refetch()}
          />
        )}

        {profile.data && (
          <>
            {/* Profile header */}
            <header className="profile-header">
              <ProfileIcon
                version={version}
                iconId={profile.data.summoner.profileIconId}
                level={profile.data.summoner.summonerLevel}
                alt={`${profile.data.account.gameName} profile icon`}
              />
              <div className="identity">
                <h1>{profile.data.account.gameName}<span className="tag">#{profile.data.account.tagLine}</span></h1>
                <div className="meta-row">
                  <RegionPill region={region} />
                  <span className="level">Level <span className="numeric">{profile.data.summoner.summonerLevel}</span></span>
                </div>
                <div className="meta-row">
                  <span className="updated">Last updated {new Date(profile.data.account.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </header>

            {/* Two-column body */}
            <div className="profile-body">
              {/* Sidebar 30% */}
              <div className="sidebar">
                {/* Ranked */}
                <section>
                  <h2 className="section-title">Ranked</h2>
                  {league.isLoading && <Loading label="Loading ranked" />}
                  {league.isError && (
                    <ErrorState
                      title="Couldn't load ranked"
                      message={(league.error as { message?: string })?.message ?? "Unknown error."}
                      status={(league.error as { status?: number })?.status}
                      onRetry={() => league.refetch()}
                    />
                  )}
                  {league.data && league.data.entries.length === 0 && (
                    <p className="muted">No ranked games this season.</p>
                  )}
                  {league.data && league.data.entries.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      {league.data.entries.map((e) => (
                        <RankedBadge key={`${e.puuid}-${e.queueType}`} entry={e} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Top Champions */}
                <section>
                  <h2 className="section-title">Top Champions</h2>
                  {mastery.isLoading && <Loading label="Loading mastery" />}
                  {mastery.isError && (
                    <ErrorState
                      title="Couldn't load mastery"
                      message={(mastery.error as { message?: string })?.message ?? "Unknown error."}
                      status={(mastery.error as { status?: number })?.status}
                      onRetry={() => mastery.refetch()}
                    />
                  )}
                  {mastery.data && mastery.data.masteries.length === 0 && (
                    <p className="muted">No champion mastery recorded yet.</p>
                  )}
                  {mastery.data && mastery.data.masteries.length > 0 && (
                    <MasteryGrid
                      masteries={mastery.data.masteries}
                      champions={championMap}
                      version={version}
                      limit={6}
                    />
                  )}
                </section>
              </div>

              {/* Main 70% */}
              <div className="main">
                <section>
                  <h2 className="section-title">Recent Matches</h2>
                  <MatchHistory
                    gameName={gameName}
                    tagLine={tagLine}
                    region={region}
                    puuid={profile.data?.account.puuid}
                    version={version}
                    championMap={championMap}
                    spellMap={spellMap}
                    runeMap={runeMap}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />
                </section>
              </div>
            </div>
          </>
        )}

        {!profile.isLoading && !profile.isError && !profile.data && (
          <EmptyState title="Search for a summoner" hint="Enter a Riot ID and a region." />
        )}
      </div>
      <Footer />
    </>
  );
}