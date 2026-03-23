// frontend/src/components/config/ICCSConfig.tsx

import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  ScaleIcon,
  GiftIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import type {
  SubsystemDefinition,
  MaturityFramework
  //MaturityLevel
} from '../../types/maturity';
import SubsystemManager from './SubsystemManager';
import { maturityService } from '../../services/maturityService';

interface ICCSConfigProps {
  /** Parent indicator ID */
  indicatorId: string;
  
  /** Initial subsystems configuration */
  initialSubsystems?: SubsystemDefinition[];
  
  /** Callback when configuration is saved */
  onSave?: (subsystems: SubsystemDefinition[]) => void;
  
  /** Callback when configuration is cancelled */
  onCancel?: () => void;
  
  /** Is the config in read-only mode? */
  readOnly?: boolean;
}

// Pre-defined ICCS subsystems from the Revised AIMS Framework
const DEFAULT_ICCS_SUBSYSTEMS: Omit<SubsystemDefinition, 'id' | 'maturityFramework' | 'displayOrder' | 'isActive'>[] = [
  {
    name: 'Complaint Management Mechanism',
    description: 'System for receiving and handling complaints about code of conduct/ethics violations',
    weight: 8
  },
  {
    name: 'Conflict of Interest Management',
    description: 'Declaration and management of conflicts of interest',
    weight: 8
  },
  {
    name: 'Gift Management System',
    description: 'Declaration and management of gifts as per Gift Rules 2017',
    weight: 8
  },
  {
    name: 'Proactive Systemic Integrity Enhancements',
    description: 'Innovation and continuous improvement in integrity systems',
    weight: 8
  }
];

// Default maturity framework template for ICCS subsystems
const DEFAULT_ICCS_FRAMEWORK: MaturityFramework = {
  enabled: true,
  levels: [
    {
      level: 0,
      name: 'Nascent',
      description: 'No formal systems established',
      points: 0,
      parameters: []
    },
    {
      level: 1,
      name: 'Foundational',
      description: 'Basic systems exist',
      points: 4,
      parameters: []
    },
    {
      level: 2,
      name: 'Established',
      description: 'Systems operational and consistently used',
      points: 6,
      parameters: []
    },
    {
      level: 3,
      name: 'Advanced',
      description: 'Systems embedded in culture',
      points: 8,
      parameters: []
    }
  ],
  scoringRule: {
    type: 'maturity-level',
    levelPoints: {
      0: 0,
      1: 4,
      2: 6,
      3: 8
    }
  }
};

// Subsystem-specific parameter templates (from the Revised Framework document)
const SUBSYSTEM_PARAMETER_TEMPLATES: Record<string, Partial<MaturityFramework>> = {
  'complaint': {
    levels: [
      {
        level: 1,
        name: 'Foundational',
        description: 'Basic structural elements for complaint management exist',
        points: 4,
        parameters: [
          {
            id: 'complaint_1_1',
            code: '1.1',
            description: 'Designated Committee/Authority',
            whatToLookFor: 'The agency has designated a Disciplinary Committee (the HRC functions as the Disciplinary Committee per Section 19.8.1) with clear terms of reference.',
            required: true,
            displayOrder: 0
          },
          {
            id: 'complaint_1_2',
            code: '1.2',
            description: 'Complaint Mechanism Established',
            whatToLookFor: 'The agency has established a mechanism for receiving complaints, including clear channels (e.g., designated officer, complaint box, email, online portal).',
            required: true,
            displayOrder: 1
          },
          {
            id: 'complaint_1_3',
            code: '1.3',
            description: 'Complaint Register Maintained',
            whatToLookFor: 'The agency maintains a register or log of all complaints received.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'complaint_1_4',
            code: '1.4',
            description: 'Basic Awareness',
            whatToLookFor: 'Employees are generally aware that they can report violations through established channels.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'complaint_1_5',
            code: '1.5',
            description: 'ADR Awareness',
            whatToLookFor: 'The agency is aware of Alternative Dispute Resolution as an option for less serious misconduct (Section 19.7).',
            required: false,
            displayOrder: 4
          }
        ]
      },
      {
        level: 2,
        name: 'Established',
        description: 'Complaint management system is operational and consistently used',
        points: 6,
        parameters: [
          {
            id: 'complaint_2_1',
            code: '2.1',
            description: 'Complaints Processed Systematically',
            whatToLookFor: 'All complaints received are logged, assessed for prima facie validity, and processed according to established procedures.',
            required: true,
            displayOrder: 0
          },
          {
            id: 'complaint_2_2',
            code: '2.2',
            description: 'Timely Notification of Respondents',
            whatToLookFor: 'Respondents are notified in writing of charges within reasonable timeframes and given opportunity to respond.',
            required: true,
            displayOrder: 1
          },
          {
            id: 'complaint_2_3',
            code: '2.3',
            description: 'Investigations Conducted',
            whatToLookFor: 'When required, investigations are conducted by designated investigators or an Investigation Committee within prescribed timelines.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'complaint_2_4',
            code: '2.4',
            description: 'Disciplinary Committee Meetings Held',
            whatToLookFor: 'The Disciplinary Committee meets to consider cases, reviews investigation reports, and makes decisions within 30 days of receiving investigation reports.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'complaint_2_5',
            code: '2.5',
            description: 'Decisions Communicated',
            whatToLookFor: 'Decisions of the Disciplinary Committee are endorsed by HRC and communicated to respondents within 5 working days as required.',
            required: true,
            displayOrder: 4
          },
          {
            id: 'complaint_2_6',
            code: '2.6',
            description: 'ADR Utilized Appropriately',
            whatToLookFor: 'Alternative Dispute Resolution is used for less serious misconduct where appropriate, with clear documentation of ADR attempts and outcomes.',
            required: false,
            displayOrder: 5
          },
          {
            id: 'complaint_2_7',
            code: '2.7',
            description: 'Appeal Rights Communicated',
            whatToLookFor: 'Respondents are informed of their right to appeal decisions, including the applicable appellate authority and timeframe (10 working days).',
            required: true,
            displayOrder: 6
          },
          {
            id: 'complaint_2_8',
            code: '2.8',
            description: 'Basic Data Collection',
            whatToLookFor: 'The agency collects basic data on complaints received, types of offences, actions taken, and outcomes.',
            required: true,
            displayOrder: 7
          }
        ]
      },
      {
        level: 3,
        name: 'Advanced',
        description: 'Complaint management is embedded in agency culture and operations',
        points: 8,
        parameters: [
          {
            id: 'complaint_3_1',
            code: '3.1',
            description: 'Proactive Risk Analysis',
            whatToLookFor: 'The agency analyzes complaint and disciplinary data to identify patterns, systemic risks, or recurring issues (e.g., specific divisions, types of misconduct, vulnerable positions).',
            required: true,
            displayOrder: 0
          },
          {
            id: 'complaint_3_2',
            code: '3.2',
            description: 'Trend-Based Interventions',
            whatToLookFor: 'Based on risk analysis, the agency develops targeted interventions such as additional training for specific divisions, revised procedures, enhanced controls, or policy clarifications.',
            required: true,
            displayOrder: 1
          },
          {
            id: 'complaint_3_3',
            code: '3.3',
            description: 'Consistent and Fair Enforcement',
            whatToLookFor: 'Disciplinary actions are applied consistently for similar offences, with clear documentation of mitigating and aggravating factors considered.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'complaint_3_4',
            code: '3.4',
            description: 'Protection of Complainants',
            whatToLookFor: 'The agency has effective measures to protect complainants from victimization, and complaints are treated confidentially throughout the process.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'complaint_3_5',
            code: '3.5',
            description: 'Timely Resolution',
            whatToLookFor: 'Complaints are resolved within reasonable timeframes, with tracking of timelines and accountability for delays.',
            required: true,
            displayOrder: 4
          },
          {
            id: 'complaint_3_6',
            code: '3.6',
            description: 'Learning from Cases',
            whatToLookFor: 'Lessons from disciplinary cases are communicated to staff (anonymized) and used to strengthen systems, clarify expectations, or prevent recurrence.',
            required: true,
            displayOrder: 5
          },
          {
            id: 'complaint_3_7',
            code: '3.7',
            description: 'Negative List Maintained and Used',
            whatToLookFor: 'The agency maintains accurate records of civil servants on the Negative List and uses this information appropriately in HR decisions (e.g., promotions, appointments).',
            required: true,
            displayOrder: 6
          },
          {
            id: 'complaint_3_8',
            code: '3.8',
            description: 'Periodic Review of Complaint Mechanism',
            whatToLookFor: 'The complaint mechanism itself is periodically reviewed and improved based on feedback, lessons learned, and changing circumstances.',
            required: true,
            displayOrder: 7
          },
          {
            id: 'complaint_3_9',
            code: '3.9',
            description: 'Staff Confidence in System',
            whatToLookFor: 'Staff at all levels express confidence in the fairness and effectiveness of the complaint mechanism and feel safe reporting concerns.',
            required: false,
            displayOrder: 8
          },
          {
            id: 'complaint_3_10',
            code: '3.10',
            description: 'Integration with Other Integrity Systems',
            whatToLookFor: 'Complaint data is cross-referenced with other integrity systems—Code of Conduct breaches, CoI declarations, gift disclosures—to identify broader patterns.',
            required: false,
            displayOrder: 9
          },
          {
            id: 'complaint_3_11',
            code: '3.11',
            description: 'Reporting to Leadership',
            whatToLookFor: 'Regular reports on complaint trends, disciplinary actions, and lessons learned are submitted to agency leadership and used for strategic decision-making.',
            required: true,
            displayOrder: 10
          }
        ]
      }
    ]
  },
  'coi': {
    levels: [
      {
        level: 1,
        name: 'Foundational',
        description: 'Basic structural elements for CoI management exist',
        points: 4,
        parameters: [
          {
            id: 'coi_1_1',
            code: '1.1',
            description: 'CoI Policy Exists',
            whatToLookFor: 'The agency has adopted or developed a Conflict of Interest policy (either as a standalone document or integrated into Code of Conduct/Service Rules).',
            required: true,
            displayOrder: 0
          },
          {
            id: 'coi_1_2',
            code: '1.2',
            description: 'Designated Officer/Committee',
            whatToLookFor: 'An officer or committee has been designated to receive and manage CoI declarations (may be the same as GDA or Asset Declaration Administrator).',
            required: true,
            displayOrder: 1
          },
          {
            id: 'coi_1_3',
            code: '1.3',
            description: 'Declaration Forms Available',
            whatToLookFor: 'CoI declaration forms (annual and/or transaction-based) are available to staff.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'coi_1_4',
            code: '1.4',
            description: 'Basic Awareness',
            whatToLookFor: 'Staff are aware that they must declare conflicts of interest.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'coi_1_5',
            code: '1.5',
            description: 'Asset Declaration Integration',
            whatToLookFor: 'The agency ensures that covered officials submit annual asset declarations, which include interest declarations as required by Asset Declaration Rules.',
            required: true,
            displayOrder: 4
          }
        ]
      },
      {
        level: 2,
        name: 'Established',
        description: 'CoI management system is operational and consistently used',
        points: 6,
        parameters: [
          {
            id: 'coi_2_1',
            code: '2.1',
            description: 'Transaction Declarations Used',
            whatToLookFor: 'Staff complete transaction/ad hoc declarations before sitting on panels, committees, or participating in significant decisions (procurement, HR, regulatory decisions, etc.).',
            required: true,
            displayOrder: 0
          },
          {
            id: 'coi_2_2',
            code: '2.2',
            description: 'Declarations Reviewed',
            whatToLookFor: 'The designated officer/committee reviews declarations and determines appropriate management action (recusal, waiver, etc.).',
            required: true,
            displayOrder: 1
          },
          {
            id: 'coi_2_3',
            code: '2.3',
            description: 'Management Actions Implemented',
            whatToLookFor: 'Decisions on recusal, waiver, or other management options are consistently implemented and documented.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'coi_2_4',
            code: '2.4',
            description: 'Annual Declarations Maintained',
            whatToLookFor: 'Annual interest declarations (from asset declarations or separate CoI returns) are maintained and accessible for reference when conflicts arise.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'coi_2_5',
            code: '2.5',
            description: 'Staff Training Conducted',
            whatToLookFor: 'Regular training or awareness sessions on CoI identification and management are conducted for staff.',
            required: true,
            displayOrder: 4
          },
          {
            id: 'coi_2_6',
            code: '2.6',
            description: 'Waiver Records Maintained',
            whatToLookFor: 'Where conflicts are waived (per BCSR flexibility), the reasons for waiver are documented as required by Guideline (Section 3.2).',
            required: true,
            displayOrder: 5
          }
        ]
      },
      {
        level: 3,
        name: 'Advanced',
        description: 'CoI management is embedded in agency culture and workflows',
        points: 8,
        parameters: [
          {
            id: 'coi_3_1',
            code: '3.1',
            description: 'Proactive Risk Identification',
            whatToLookFor: 'The agency has conducted a CoI risk assessment identifying functions and positions most vulnerable to CoI (procurement, regulatory, HR, etc.).',
            required: true,
            displayOrder: 0
          },
          {
            id: 'coi_3_2',
            code: '3.2',
            description: 'Integration Across Systems',
            whatToLookFor: 'CoI declarations are cross-referenced with other integrity tools—gift declarations, asset declarations, secondary employment records—to identify patterns or undisclosed interests.',
            required: true,
            displayOrder: 1
          },
          {
            id: 'coi_3_3',
            code: '3.3',
            description: 'Regular Monitoring and Audits',
            whatToLookFor: 'CoI compliance is subject to periodic internal audit or independent verification.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'coi_3_4',
            code: '3.4',
            description: 'Breaches Addressed Systematically',
            whatToLookFor: 'Breaches of CoI policy (failure to declare, acting with undisclosed conflict) are investigated and appropriate penalties imposed.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'coi_3_5',
            code: '3.5',
            description: 'Staff Demonstrate Deep Understanding',
            whatToLookFor: 'Staff at all levels can articulate what constitutes a CoI, when to declare, and how conflicts are managed. They understand the difference between actual, potential, and perceived conflicts.',
            required: true,
            displayOrder: 4
          },
          {
            id: 'coi_3_6',
            code: '3.6',
            description: 'Learning from Cases',
            whatToLookFor: 'Any CoI breaches or near-misses are used as learning opportunities to strengthen systems and awareness.',
            required: true,
            displayOrder: 5
          },
          {
            id: 'coi_3_7',
            code: '3.7',
            description: 'Policy Reviewed and Updated',
            whatToLookFor: 'The CoI policy is periodically reviewed and updated based on emerging risks, organizational changes, or lessons learned.',
            required: true,
            displayOrder: 6
          },
          {
            id: 'coi_3_8',
            code: '3.8',
            description: 'Reporting to Leadership',
            whatToLookFor: 'Regular reports on CoI management (declarations received, actions taken, breaches, lessons learned) are submitted to agency leadership.',
            required: true,
            displayOrder: 7
          }
        ]
      }
    ]
  },
  'gift': {
    levels: [
      {
        level: 1,
        name: 'Foundational',
        description: 'Basic structural elements for gift management exist',
        points: 4,
        parameters: [
          {
            id: 'gift_1_1',
            code: '1.1',
            description: 'Designation of GDA',
            whatToLookFor: 'A Gift Disclosure Administrator has been formally designated by the Head of Agency.',
            required: true,
            displayOrder: 0
          },
          {
            id: 'gift_1_2',
            code: '1.2',
            description: 'Constitution of Committee',
            whatToLookFor: 'A Gift Administration Committee has been constituted with a minimum of three members.',
            required: true,
            displayOrder: 1
          },
          {
            id: 'gift_1_3',
            code: '1.3',
            description: 'Gift Register Exists',
            whatToLookFor: 'A gift register (physical or electronic) is maintained to record disclosures.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'gift_1_4',
            code: '1.4',
            description: 'Basic Awareness',
            whatToLookFor: 'Staff are aware that gifts must be declared.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'gift_1_5',
            code: '1.5',
            description: 'Disclosure Forms Available',
            whatToLookFor: 'Gift Disclosure Forms (Annexure I) are accessible to staff.',
            required: true,
            displayOrder: 4
          }
        ]
      },
      {
        level: 2,
        name: 'Established',
        description: 'Gift management system is operational and consistently used',
        points: 6,
        parameters: [
          {
            id: 'gift_2_1',
            code: '2.1',
            description: 'Consistent Disclosure',
            whatToLookFor: 'Gifts are being disclosed within the required 24-hour timeframe on a regular basis.',
            required: true,
            displayOrder: 0
          },
          {
            id: 'gift_2_2',
            code: '2.2',
            description: 'Committee Meetings Held',
            whatToLookFor: 'The Gift Administration Committee meets as and when required to review gifts, particularly those pertaining to the Head of Agency.',
            required: true,
            displayOrder: 1
          },
          {
            id: 'gift_2_3',
            code: '2.3',
            description: 'Proper Disposal/Retention',
            whatToLookFor: 'Gifts are being disposed of or retained in accordance with Rule 33.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'gift_2_4',
            code: '2.4',
            description: 'GDA Maintains Records',
            whatToLookFor: 'The GDA actively maintains the gift register and ensures all particulars from disclosure forms are entered.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'gift_2_5',
            code: '2.5',
            description: 'Staff Training Conducted',
            whatToLookFor: 'Regular training or awareness sessions on gift rules are conducted for staff.',
            required: true,
            displayOrder: 4
          },
          {
            id: 'gift_2_6',
            code: '2.6',
            description: 'Annual Review Conducted',
            whatToLookFor: 'The Committee has reviewed the administration of gifts for the financial year.',
            required: true,
            displayOrder: 5
          }
        ]
      },
      {
        level: 3,
        name: 'Advanced',
        description: 'Gift management is embedded in agency culture and workflows',
        points: 8,
        parameters: [
          {
            id: 'gift_3_1',
            code: '3.1',
            description: 'Proactive Risk Analysis',
            whatToLookFor: 'The agency analyzes gift data to identify patterns or risks (e.g., repeated gifts from same source, spikes during procurement cycles).',
            required: true,
            displayOrder: 0
          },
          {
            id: 'gift_3_2',
            code: '3.2',
            description: 'Integration with COI Framework',
            whatToLookFor: 'Gift disclosures are cross-referenced with Conflict of Interest declarations to identify potential conflicts.',
            required: true,
            displayOrder: 1
          },
          {
            id: 'gift_3_3',
            code: '3.3',
            description: 'Regular Audits/Checks',
            whatToLookFor: 'The gift register and disposal records are subject to periodic internal audit or independent verification.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'gift_3_4',
            code: '3.4',
            description: 'Committee Recommendations Implemented',
            whatToLookFor: 'Recommendations from the Committee\'s annual review are acted upon, leading to improvements in the gift management system.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'gift_3_5',
            code: '3.5',
            description: 'Staff Demonstrate Understanding',
            whatToLookFor: 'Staff at all levels demonstrate a clear understanding of what constitutes a prohibited gift, when disclosure is required, and how to handle unsolicited gifts.',
            required: true,
            displayOrder: 4
          },
          {
            id: 'gift_3_6',
            code: '3.6',
            description: 'Learning from Cases',
            whatToLookFor: 'Any breaches or near-misses are used as learning opportunities to strengthen the system.',
            required: true,
            displayOrder: 5
          },
          {
            id: 'gift_3_7',
            code: '3.7',
            description: 'Timely and Complete Records',
            whatToLookFor: 'Gift records are maintained for the required five-year period and are readily accessible for audit or inspection.',
            required: true,
            displayOrder: 6
          }
        ]
      }
    ]
  },
  'proactive': {
    levels: [
      {
        level: 1,
        name: 'Foundational',
        description: 'Initial, limited efforts to enhance integrity beyond mandatory systems',
        points: 2,
        parameters: [
          {
            id: 'proactive_1_1',
            code: '1.1',
            description: 'Identification of Improvement Areas',
            whatToLookFor: 'The agency has identified at least one area for integrity enhancement beyond mandatory systems (may be through risk assessment, audit findings, staff feedback, etc.).',
            required: true,
            displayOrder: 0
          },
          {
            id: 'proactive_1_2',
            code: '1.2',
            description: 'Planned Initiative',
            whatToLookFor: 'The agency has developed a plan or proposal for an integrity enhancement initiative, even if not yet fully implemented.',
            required: true,
            displayOrder: 1
          },
          {
            id: 'proactive_1_3',
            code: '1.3',
            description: 'Initial Implementation',
            whatToLookFor: 'At least one integrity enhancement initiative has been partially implemented or piloted.',
            required: false,
            displayOrder: 2
          },
          {
            id: 'proactive_1_4',
            code: '1.4',
            description: 'Awareness of Good Practices',
            whatToLookFor: 'The agency has demonstrated awareness of integrity practices in other agencies or jurisdictions and considered their applicability.',
            required: false,
            displayOrder: 3
          }
        ]
      },
      {
        level: 2,
        name: 'Established',
        description: 'Implemented integrity initiatives with observable results',
        points: 5,
        parameters: [
          {
            id: 'proactive_2_1',
            code: '2.1',
            description: 'Implemented Initiative(s)',
            whatToLookFor: 'At least one integrity enhancement initiative has been fully implemented and is operational.',
            required: true,
            displayOrder: 0
          },
          {
            id: 'proactive_2_2',
            code: '2.2',
            description: 'Documented Process',
            whatToLookFor: 'The agency has documented the process of identifying, designing, and implementing the initiative, showing a systematic approach.',
            required: true,
            displayOrder: 1
          },
          {
            id: 'proactive_2_3',
            code: '2.3',
            description: 'Reach and Coverage',
            whatToLookFor: 'The initiative reaches or affects a significant portion of the agency\'s operations or staff.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'proactive_2_4',
            code: '2.4',
            description: 'Initial Evidence of Impact',
            whatToLookFor: 'The agency has begun to collect data or feedback on the initiative\'s effectiveness.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'proactive_2_5',
            code: '2.5',
            description: 'Multiple Initiatives',
            whatToLookFor: 'The agency has implemented more than one integrity enhancement initiative, demonstrating a pattern of proactive improvement.',
            required: false,
            displayOrder: 4
          },
          {
            id: 'proactive_2_6',
            code: '2.6',
            description: 'Communication of Initiatives',
            whatToLookFor: 'The agency has communicated its integrity initiatives to staff and relevant stakeholders.',
            required: true,
            displayOrder: 5
          }
        ]
      },
      {
        level: 3,
        name: 'Advanced',
        description: 'Robust, systematic program of continuous integrity improvement',
        points: 8,
        parameters: [
          {
            id: 'proactive_3_1',
            code: '3.1',
            description: 'Systematic Improvement Program',
            whatToLookFor: 'The agency has an ongoing, systematic program for identifying, implementing, and evaluating integrity enhancements, not just isolated initiatives.',
            required: true,
            displayOrder: 0
          },
          {
            id: 'proactive_3_2',
            code: '3.2',
            description: 'Multiple, Diverse Initiatives',
            whatToLookFor: 'The agency has implemented multiple initiatives across different areas (policy, process, technology, culture, oversight) demonstrating comprehensive approach.',
            required: true,
            displayOrder: 1
          },
          {
            id: 'proactive_3_3',
            code: '3.3',
            description: 'Innovation and Originality',
            whatToLookFor: 'The agency has developed or adapted innovative solutions tailored to its specific context, not merely copying others\' practices.',
            required: true,
            displayOrder: 2
          },
          {
            id: 'proactive_3_4',
            code: '3.4',
            description: 'Demonstrated Impact',
            whatToLookFor: 'The agency can demonstrate measurable impact of its initiatives on integrity outcomes—reduced risks, improved transparency, enhanced accountability, positive stakeholder feedback.',
            required: true,
            displayOrder: 3
          },
          {
            id: 'proactive_3_5',
            code: '3.5',
            description: 'Integration Across Systems',
            whatToLookFor: 'Integrity enhancements are integrated with core systems (Gift, CoI, Code, Complaint) and contribute to a coherent integrity framework.',
            required: true,
            displayOrder: 4
          },
          {
            id: 'proactive_3_6',
            code: '3.6',
            description: 'Evaluation and Refinement',
            whatToLookFor: 'The agency regularly evaluates its initiatives and refines them based on evidence and feedback.',
            required: true,
            displayOrder: 5
          },
          {
            id: 'proactive_3_7',
            code: '3.7',
            description: 'Staff Engagement and Ownership',
            whatToLookFor: 'Staff at various levels are engaged in identifying, designing, or implementing integrity enhancements, creating ownership beyond leadership.',
            required: true,
            displayOrder: 6
          },
          {
            id: 'proactive_3_8',
            code: '3.8',
            description: 'Peer Learning and Contribution',
            whatToLookFor: 'The agency shares its practices with other agencies, contributes to cross-agency learning, or mentors others in integrity improvement.',
            required: false,
            displayOrder: 7
          },
          {
            id: 'proactive_3_9',
            code: '3.9',
            description: 'Sustainability',
            whatToLookFor: 'Initiatives are sustainable beyond initial funding or champion—embedded in budgets, systems, and culture.',
            required: true,
            displayOrder: 8
          },
          {
            id: 'proactive_3_10',
            code: '3.10',
            description: 'Reporting to Leadership and Public',
            whatToLookFor: 'The agency regularly reports on its integrity enhancement initiatives and their impact to leadership and, where appropriate, to the public.',
            required: true,
            displayOrder: 9
          }
        ]
      }
    ]
  }
};

export const ICCSConfig: React.FC<ICCSConfigProps> = ({
  indicatorId,
  initialSubsystems,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [subsystems, setSubsystems] = useState<SubsystemDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadSubsystems = async () => {
      if (initialSubsystems) {
        setSubsystems(initialSubsystems);
        return;
      }

      setLoading(true);
      try {
        const response = await maturityService.getSubsystems(indicatorId);
        if (response.success && response.data) {
          setSubsystems(response.data);
        } else {
          // If no subsystems exist, create default ones
          const defaultSubsystems = DEFAULT_ICCS_SUBSYSTEMS.map((sub, index) => {
            const type = index === 0 ? 'complaint' : 
                        index === 1 ? 'coi' :
                        index === 2 ? 'gift' : 'proactive';
            
            const template = SUBSYSTEM_PARAMETER_TEMPLATES[type];
            
            // Merge default framework with template
            const framework: MaturityFramework = {
              ...DEFAULT_ICCS_FRAMEWORK,
              levels: DEFAULT_ICCS_FRAMEWORK.levels.map(level => {
                const templateLevel = template?.levels?.find(l => l.level === level.level);
                return {
                  ...level,
                  parameters: templateLevel?.parameters || []
                };
              })
            };

            return {
              id: `sub_${type}_${Date.now()}_${index}`,
              ...sub,
              maturityFramework: framework,
              displayOrder: index,
              isActive: true
            };
          });
          setSubsystems(defaultSubsystems);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load subsystems');
      } finally {
        setLoading(false);
      }
    };

    loadSubsystems();
  }, [indicatorId, initialSubsystems]);

  // Handle subsystem changes
  const handleSubsystemsChange = (updatedSubsystems: SubsystemDefinition[]) => {
    setSubsystems(updatedSubsystems);
  };

  // Handle framework changes for a specific subsystem
  const handleFrameworkChange = (subsystemId: string, framework: MaturityFramework) => {
    setSubsystems(prev =>
      prev.map(sub =>
        sub.id === subsystemId
          ? { ...sub, maturityFramework: framework }
          : sub
      )
    );
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await maturityService.updateSubsystems(indicatorId, subsystems);
      if (response.success) {
        setSuccess('ICCS configuration saved successfully');
        onSave?.(subsystems);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  // Calculate total score distribution
  const getScoreDistribution = () => {
    const distribution = {
      nascent: { count: 0, potential: 0 },
      foundational: { count: 0, potential: 4 },
      established: { count: 0, potential: 6 },
      advanced: { count: 0, potential: 8 }
    };

    subsystems.forEach(sub => {
      const levels = sub.maturityFramework.levels;
      levels.forEach(level => {
        if (level.level === 0) distribution.nascent.count++;
        else if (level.level === 1) distribution.foundational.count++;
        else if (level.level === 2) distribution.established.count++;
        else if (level.level === 3) distribution.advanced.count++;
      });
    });

    return distribution;
  };

  const scoreDist = getScoreDistribution();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading ICCS configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              ICCS Configuration
            </h2>
            <p className="text-gray-600">
              Internal Corruption Control Systems - Configure the four core integrity subsystems
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ScaleIcon className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Complaint</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {subsystems.find(s => s.name.includes('Complaint'))?.weight || 8} pts
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Conflict of Interest</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {subsystems.find(s => s.name.includes('Conflict'))?.weight || 8} pts
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <GiftIcon className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Gift</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {subsystems.find(s => s.name.includes('Gift'))?.weight || 8} pts
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <LightBulbIcon className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Proactive</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {subsystems.find(s => s.name.includes('Proactive'))?.weight || 8} pts
              </span>
            </div>
          </div>
        </div>

        {/* Score Distribution Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Score Distribution Overview</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-600">Nascent (L0)</div>
              <div className="text-lg font-semibold text-gray-900">{scoreDist.nascent.count} params</div>
              <div className="text-xs text-gray-500">0 pts each</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Foundational (L1)</div>
              <div className="text-lg font-semibold text-blue-600">{scoreDist.foundational.count} params</div>
              <div className="text-xs text-gray-500">{scoreDist.foundational.potential} pts max</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Established (L2)</div>
              <div className="text-lg font-semibold text-green-600">{scoreDist.established.count} params</div>
              <div className="text-xs text-gray-500">{scoreDist.established.potential} pts max</div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Advanced (L3)</div>
              <div className="text-lg font-semibold text-purple-600">{scoreDist.advanced.count} params</div>
              <div className="text-xs text-gray-500">{scoreDist.advanced.potential} pts max</div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <p className="ml-3 text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}
      </div>

      {/* Subsystem Manager */}
      <div className="bg-white rounded-lg shadow p-6">
        <SubsystemManager
          indicatorId={indicatorId}
          subsystems={subsystems}
          totalWeight={32} // ICCS total weight
          onChange={handleSubsystemsChange}
          onFrameworkChange={handleFrameworkChange}
          onSave={handleSave}
          onCancel={onCancel}
          readOnly={readOnly}
        />
      </div>

      {/* Save Status */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
          <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
          Saving configuration...
        </div>
      )}
    </div>
  );
};

export default ICCSConfig;