#!/usr/bin/env python3
import json

def calculate_stats(log_file):
    with open(log_file, 'r') as f:
        logs = [json.loads(line) for line in f if line.strip()]

    # Track unique sessions (users)
    unique_sessions = set()
    session_occurrences = {}
    fingerprint_hashes = set()

    for entry in logs:
        if 'sessionId' in entry:
            session_id = entry['sessionId']
            unique_sessions.add(session_id)

            if session_id not in session_occurrences:
                session_occurrences[session_id] = 0
            session_occurrences[session_id] += 1

        if 'data' in entry and 'fingerprint_hash' in entry['data']:
            fingerprint_hashes.add(entry['data']['fingerprint_hash'])

    # Users with multiple fingerprints (returning users)
    returning_users = sum(1 for count in session_occurrences.values() if count > 1)

    total_unique_users = len(unique_sessions)
    total_fingerprints = len(logs)
    avg_sessions = round(total_fingerprints / total_unique_users, 2) if total_unique_users > 0 else 0

    print(f"📊 Statistics for {log_file}:")
    print(f"  Total Fingerprints: {total_fingerprints}")
    print(f"  Unique Users (Sessions): {total_unique_users}")
    print(f"  Returning Users: {returning_users}")
    print(f"  Avg Fingerprints/User: {avg_sessions}")
    print(f"  Unique Hash Values: {len(fingerprint_hashes)} (varies due to benchmarks)")
    print("\n  Sessions breakdown:")
    for session_id, count in session_occurrences.items():
        print(f"    {session_id}: {count} fingerprints")
    print()

# Test with production data
print("Testing with your production data:\n")
calculate_stats('data/production-test.log')

# Compare with local test data
print("\nComparing with local test data:\n")
calculate_stats('data/fingerprints.log')