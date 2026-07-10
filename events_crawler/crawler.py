import argparse
import json
import os
import random
from datetime import datetime, timedelta
import sys

def parse_args():
    parser = argparse.ArgumentParser(description="Events Scraper")
    parser.add_argument("--city", required=True, help="City to search events in")
    parser.add_argument("--area", default="", help="Area/venue area to search events in")
    parser.add_argument("--max", type=int, default=10, help="Max results to fetch")
    return parser.parse_args()

def generate_mock_events(city, area, max_count):
    events = []
    
    titles_student_tribe = [
        "Student Leadership Conclave",
        "Youth Entrepreneurship Summit",
        "College Tech Fest & Hackathon",
        "Inter-College Business Quiz",
        "Youth Cultural Fest",
        "Student Web3 Meetup"
    ]
    
    titles_luma = [
        "Design System Workshop",
        "AI Founders Meetup",
        "Product Managers Roundtable",
        "SaaS Networking Mixer",
        "Indie Hackers Coffee",
        "Venture Capital Panel"
    ]
    
    titles_devfolio = [
        "HackVerse Hackathon",
        "CodeQuest Hackathon",
        "EthGlobal City Build",
        "Web3 Buildathon",
        "AI Hackfest",
        "ByteCode Hack"
    ]
    
    titles_unstop = [
        "National Case Study Challenge",
        "Brand Strategy Olympiad",
        "Algorithm Coding Cup",
        "Data Science Battleground",
        "Pitch Elevator Competition",
        "Finance Case Competition"
    ]

    platforms = ["Student Tribe", "Luma", "Devfolio", "Unstop"]
    
    organizers = {
        "Student Tribe": ["Student Tribe Council", "Campus Ambassador Network", "Tribe Campus Core"],
        "Luma": ["Tech Community Host", "Luma Guild", "Founders Hub"],
        "Devfolio": ["Devfolio Community Team", "Polygon Guild", "Ethereum Foundation Hub"],
        "Unstop": ["Unstop Partner College", "Unstop Corporate Team", "E-Cell Council"]
    }
    
    for i in range(max_count):
        source = random.choice(platforms)
        org = random.choice(organizers[source])
        
        if source == "Student Tribe":
            title = random.choice(titles_student_tribe)
        elif source == "Luma":
            title = random.choice(titles_luma)
        elif source == "Devfolio":
            title = random.choice(titles_devfolio)
        else:
            title = random.choice(titles_unstop)
            
        title = f"{title} — {city}"
        if area:
            title = f"{title} ({area})"
            
        desc = (
            f"Join us for the prestigious {title} event. "
            f"A curated gathering organized by {org} specifically for enthusiasts in {city}."
        )
        
        days_offset = random.randint(3, 30)
        start_date = datetime.now() + timedelta(days=days_offset)
        end_date = start_date + timedelta(days=random.randint(0, 2))
        
        start_time = f"{random.choice(['09', '10', '11'])}:00 AM"
        end_time = f"{random.choice(['04', '05', '06'])}:00 PM"
        
        venue = f"{area if area else 'Main Auditorium'}, {city}, India"
        
        events.append({
            "title": title,
            "description": desc,
            "organisingCollege": org,
            "representatives": json.dumps([{"id": f"rep_{i}", "name": "Host Staff"}]),
            "startDate": start_date.strftime("%Y-%m-%dT00:00:00.000Z"),
            "endDate": end_date.strftime("%Y-%m-%dT00:00:00.000Z"),
            "startTime": start_time,
            "endTime": end_time,
            "venueAddress": venue,
            "source": source,
            "allowed": False
        })
        
    return events

def main():
    args = parse_args()
    events = generate_mock_events(args.city, args.area, args.max)
    
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
    os.makedirs(output_dir, exist_ok=True)
    
    latest_path = os.path.join(output_dir, "events_latest.json")
    with open(latest_path, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)
        
    print(json.dumps({"success": True, "count": len(events), "output_path": latest_path}))

if __name__ == "__main__":
    main()
