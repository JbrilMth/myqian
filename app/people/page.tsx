import React from "react";
import { getPeopleWithBalances } from "@/lib/finance/service";
import { PeopleClient } from "@/components/people/PeopleClient";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const people = await getPeopleWithBalances(true);
  return <PeopleClient initialPeople={people} />;
}
