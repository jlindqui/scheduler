Agentic scheduling
Prototype Need
chat agent w staff to assess availability, show current schedule, preferences, changes (convert to requests). has access to banks, so can advise if a request is paid vacation etc. Provides suggestions (use alternate bank preferentially). Documents staff agreement to work a violation at regular time, etc.
Backbone = CBA input, which agent is evaluating the queries against. Staff are mapped to a particular CA

Other essential inputs:

Staff schedules
Staff availability
Staff skills
Reporting structure
For later
Ultimately feeds into an optimization model w all staff's prefs and makes schedule draft (multiple options).
shares summary of staff's upcoming schedule, highlights anomalies e.g., stats, already approved vacation 
chat agent w leader. summarize schedule, risks, provide options 
Scenarios
Frontline Staff Assistance
I want next Thursday off, who can I swap with so it will be approved?
(this scenario could be similarly applied to vacation request)
Agent would prompt whether availability is up-to-date, so we know which shift could be received instead
Agent would check the existing schedule, checking staff who have matching shift schedule/availability, similar skillset, and who hasn't exceeded their swap limit in the current schedule, and who would not trigger any OT or premiums.
Agent comes back with the list of staff and details of the proposed shift swaps
Staff prompts agent to go ahead with one of the options. Theoretically agent should pursue a 2nd request if the first swap partner declines.
Agent submits the request outlining whether it triggers any scheduling rules, confirm skillset is matching, etc. (make it easy for manager to approve)
Manager approves
Request is reflected in the schedule
Schedule preparation
(Historically created based on pre-set rotational patterns, while taking into account the submitted vacation requests. Generated result should meet defined staffing targets on every shift.)
Before a manager prepares a schedule, staff must submit their availability for additional shifts and any vacation requests. 
Agent sends reminder notification to staff when submission period opens. The agent begins by stating what needs to be submitted and by when, asking if you would like to do it now. Yes? Great, here is your schedule for this upcoming period, these are your pre-approved time off, and any existing availability you may have already entered already. Agent analyses whether availability meets Collective agreement requirements and states outcome (such as whether you are available 20 hours a week, and at least 2 weekends in this scheduling period). If it doesn't, it can suggest how much more is required (or what specific types of availability if that is the case) and recommendations of availability to add. Do you want suggestions for availability on days you typically work? Do you want suggestions for availability when someone specific is (isn't) working? Agent also compares availability to staffing levels for those days and points out if they are or are not likely to be assigned shifts on certain dates, based on skills/seniority/other factors. 
Agent assesses the schedule, noticing some pre-approved time off coded as vacation. Asks the staff if they would rather use a stat because it would otherwise be paid out soon (most expire after 60-90 days). Also sees that they don't have the weekend before their week of vacation off. Often this is a requirement of the collective agreement, so agent asks if the staff wants that weekend off or documents that they don't want those extra days.
Agent asks the staff member how many shifts they want (min/max). Can ask a range of preference questions and and/or, such as "you've made yourself available for all 7 days this week. What's the most amount of shifts you'd want to work in a row?"
Agent sees that staff available for all weekends. Knowing that they can't work sequential weekends it asks whether there are preferences to which ones to work? This would be taken into account in the schedule build, if possible. 
All of this info is translated into parameters, then sent to the optimization model to generate the actual schedules