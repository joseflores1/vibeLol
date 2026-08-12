import { useParams, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { SearchBar } from "../components/SearchBar";
import { Footer } from "../components/Footer";
import { Loading } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ProfileIcon } from "../components/ProfileIcon";
import { RankedBadge } from "../components/RankedBadge";
import { MasteryList } from "../components/MasteryList";
import {
  useSummonerProfile,
  useLeagueByRiotId,
  useMasteryByRiotId,
  useStaticVersion,
  useStaticChampions,
  type RiotRegion,
} from "../hooks/useApi";
import "./SummonerProfile.css";

// SummonerProfile — the per-player stats page. One coherent surface: search
// bar at top, summoner identity + level, ranked badges, champion mastery.
//.oneshot — match history + match detail land in PR #9.

function assertRegion(s: string | null): RiotRegion {
  // The search bar only emits valid regions; the default is na1. If a user
  // hand-edits the URL to anything weird, fall back to na1 — zod on the
  // backend will reject a real invalid region with 400.
  const valid: RiotRegion[] = ["na1", "br1", "la1", "la2", "oc1", "euw1", "eun1", "tr1", "ru", "kr", "jp1", "ph2", "sg2", "th2", "tw2", "vn2"];
  return (valid.includes(s as RiotRegion) ? s : "na1") as RiotRegion;
}

export function SummonerProfilePage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const gameName = params.gameName ?? "";
  const tagLine = params.tagLine ?? "";
  const region = assertRegion(searchParams.get("region"));

  const profile = useSummonerProfile(gameName, tagLine, region);
  const league = useLeagueByRiotId(gameName, tagLine, region);
  const mastery = useMasteryByRiotId(gameName, tagLine, region);
  const staticVersion = useStaticVersion();
  const staticChampions = useStaticChampions();

  // Build champion lookup Map once for MasteryList.
  const championMap = useMemo(() => {
    const m = new Map<number, { id: string; key: number; name: string; title: string; tags: string[] }>();
    if (staticChampions.data) {
      for (const c of staticChampions.data.champions) m.set(c.key, c);
    }
    return m;
  }, [staticChampions.data]);

  const version = staticVersion.data?.version ?? "";

  return (
    <>
      <div className="container">
        <div style={{ paddingBlock: "var(--space-5)" }}>
          <SearchBar initialGameName={gameName} initialTagLine={tagLine} initialRegion={region} />
        </div>

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
            <header className="profile-header">
              <ProfileIcon version={version} iconId={profile.data.summoner.profileIconId} alt={`${profile.data.account.gameName} profile icon`} />
              <div className="identity">
                <h1>{profile.data.account.gameName}<span className="muted">#{profile.data.account.tagLine}</span></h1>
                <div className="riot-id">Region {region.toUpperCase()}</div>
                <div className="level">Level <span className="numeric">{profile.data.summoner.summonerLevel}</span></div>
              </div>
            </header>

            {/* Ranked */}
            <section className="profile-section">
              <h2>Ranked</h2>
              {league.isLoading && <Loading label="Loading ranked" />}
              {league.isError && (
                <ErrorState
                  title="Couldn't load ranked entries"
                  message={(league.error as { message?: string })?.message ?? "Unknown error."}
                  status={(league.error as { status?: number })?.status}
                  onRetry={() => league.refetch()}
                />
              )}
              {league.data && league.data.entries.length === 0 && (
                <p className="muted">No ranked games this season.</p>
              )}
              {league.data && league.data.entries.length > 0 && (
                <div className="ranked-grid">
                  {league.data.entries.map((e) => (
                    <RankedBadge key={`${e.puuid}-${e.queueType}`} entry={e} />
                  ))}
                </div>
              )}
            </section>

            {/* Mastery */}
            <section className="profile-section">
              <h2>Top Champions</h2>
              {mastery.isLoading && <Loading label="Loading mastery" />}
              {mastery.isError && (
                <ErrorState
                  title="Couldn't load champion mastery"
                  message={(mastery.error as { message?: string })?.message ?? "Unknown error."}
                  status={(mastery.error as { status?: number })?.status}
                  onRetry={() => mastery.refetch()}
                />
              )}
              {mastery.data && mastery.data.masteries.length === 0 && (
                <p className="muted">No champion mastery recorded yet.</p>
              )}
              {mastery.data && mastery.data.masteries.length > 0 && (
                <MasteryList masteries={mastery.data.masteries} champions={championMap} version={version} limit={5} />
              )}
            </section>
          </>
        )}

        {/* If neither loading nor data nor error (unreachable branch), give a search prompt. */}
        {!profile.isLoading && !profile.isError && !profile.data && (
          <EmptyState title="Search for a summoner" hint="Enter a Riot ID (game name + tag line) and a region." />
        )}
      </div>
      <Footer />
    </>
  );
}