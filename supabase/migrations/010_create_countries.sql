-- Create countries table
create table if not exists public.countries (
    id bigint primary key generated always as identity,
    name text not null unique,
    code text not null unique
);

-- First, ensure all existing records have a code
UPDATE public.countries 
SET code = CASE 
    WHEN name = 'Afghanistan' THEN 'AF'
    WHEN name = 'Albania' THEN 'AL'
    WHEN name = 'Algeria' THEN 'DZ'
    WHEN name = 'Andorra' THEN 'AD'
    WHEN name = 'Angola' THEN 'AO'
    WHEN name = 'Antigua and Barbuda' THEN 'AG'
    WHEN name = 'Argentina' THEN 'AR'
    WHEN name = 'Armenia' THEN 'AM'
    WHEN name = 'Australia' THEN 'AU'
    WHEN name = 'Austria' THEN 'AT'
    WHEN name = 'Azerbaijan' THEN 'AZ'
    WHEN name = 'Bahamas' THEN 'BS'
    WHEN name = 'Bahrain' THEN 'BH'
    WHEN name = 'Bangladesh' THEN 'BD'
    WHEN name = 'Barbados' THEN 'BB'
    WHEN name = 'Belarus' THEN 'BY'
    WHEN name = 'Belgium' THEN 'BE'
    WHEN name = 'Belize' THEN 'BZ'
    WHEN name = 'Benin' THEN 'BJ'
    WHEN name = 'Bhutan' THEN 'BT'
    WHEN name = 'Bolivia' THEN 'BO'
    WHEN name = 'Bosnia and Herzegovina' THEN 'BA'
    WHEN name = 'Botswana' THEN 'BW'
    WHEN name = 'Brazil' THEN 'BR'
    WHEN name = 'Brunei' THEN 'BN'
    WHEN name = 'Bulgaria' THEN 'BG'
    WHEN name = 'Burkina Faso' THEN 'BF'
    WHEN name = 'Burundi' THEN 'BI'
    WHEN name = 'Cabo Verde' THEN 'CV'
    WHEN name = 'Cambodia' THEN 'KH'
    WHEN name = 'Cameroon' THEN 'CM'
    WHEN name = 'Canada' THEN 'CA'
    WHEN name = 'Central African Republic' THEN 'CF'
    WHEN name = 'Chad' THEN 'TD'
    WHEN name = 'Chile' THEN 'CL'
    WHEN name = 'China' THEN 'CN'
    WHEN name = 'Colombia' THEN 'CO'
    WHEN name = 'Comoros' THEN 'KM'
    WHEN name = 'Congo' THEN 'CG'
    WHEN name = 'Costa Rica' THEN 'CR'
    WHEN name = 'Croatia' THEN 'HR'
    WHEN name = 'Cuba' THEN 'CU'
    WHEN name = 'Cyprus' THEN 'CY'
    WHEN name = 'Czech Republic' THEN 'CZ'
    WHEN name = 'Denmark' THEN 'DK'
    WHEN name = 'Djibouti' THEN 'DJ'
    WHEN name = 'Dominica' THEN 'DM'
    WHEN name = 'Dominican Republic' THEN 'DO'
    WHEN name = 'Ecuador' THEN 'EC'
    WHEN name = 'Egypt' THEN 'EG'
    WHEN name = 'El Salvador' THEN 'SV'
    WHEN name = 'Equatorial Guinea' THEN 'GQ'
    WHEN name = 'Eritrea' THEN 'ER'
    WHEN name = 'Estonia' THEN 'EE'
    WHEN name = 'Eswatini' THEN 'SZ'
    WHEN name = 'Ethiopia' THEN 'ET'
    WHEN name = 'Fiji' THEN 'FJ'
    WHEN name = 'Finland' THEN 'FI'
    WHEN name = 'France' THEN 'FR'
    WHEN name = 'Gabon' THEN 'GA'
    WHEN name = 'Gambia' THEN 'GM'
    WHEN name = 'Georgia' THEN 'GE'
    WHEN name = 'Germany' THEN 'DE'
    WHEN name = 'Ghana' THEN 'GH'
    WHEN name = 'Greece' THEN 'GR'
    WHEN name = 'Grenada' THEN 'GD'
    WHEN name = 'Guatemala' THEN 'GT'
    WHEN name = 'Guinea' THEN 'GN'
    WHEN name = 'Guinea-Bissau' THEN 'GW'
    WHEN name = 'Guyana' THEN 'GY'
    WHEN name = 'Haiti' THEN 'HT'
    WHEN name = 'Honduras' THEN 'HN'
    WHEN name = 'Hungary' THEN 'HU'
    WHEN name = 'Iceland' THEN 'IS'
    WHEN name = 'India' THEN 'IN'
    WHEN name = 'Indonesia' THEN 'ID'
    WHEN name = 'Iran' THEN 'IR'
    WHEN name = 'Iraq' THEN 'IQ'
    WHEN name = 'Ireland' THEN 'IE'
    WHEN name = 'Israel' THEN 'IL'
    WHEN name = 'Italy' THEN 'IT'
    WHEN name = 'Jamaica' THEN 'JM'
    WHEN name = 'Japan' THEN 'JP'
    WHEN name = 'Jordan' THEN 'JO'
    WHEN name = 'Kazakhstan' THEN 'KZ'
    WHEN name = 'Kenya' THEN 'KE'
    WHEN name = 'Kiribati' THEN 'KI'
    WHEN name = 'Kuwait' THEN 'KW'
    WHEN name = 'Kyrgyzstan' THEN 'KG'
    WHEN name = 'Laos' THEN 'LA'
    WHEN name = 'Latvia' THEN 'LV'
    WHEN name = 'Lebanon' THEN 'LB'
    WHEN name = 'Lesotho' THEN 'LS'
    WHEN name = 'Liberia' THEN 'LR'
    WHEN name = 'Libya' THEN 'LY'
    WHEN name = 'Liechtenstein' THEN 'LI'
    WHEN name = 'Lithuania' THEN 'LT'
    WHEN name = 'Luxembourg' THEN 'LU'
    WHEN name = 'Madagascar' THEN 'MG'
    WHEN name = 'Malawi' THEN 'MW'
    WHEN name = 'Malaysia' THEN 'MY'
    WHEN name = 'Maldives' THEN 'MV'
    WHEN name = 'Mali' THEN 'ML'
    WHEN name = 'Malta' THEN 'MT'
    WHEN name = 'Marshall Islands' THEN 'MH'
    WHEN name = 'Mauritania' THEN 'MR'
    WHEN name = 'Mauritius' THEN 'MU'
    WHEN name = 'Mexico' THEN 'MX'
    WHEN name = 'Micronesia' THEN 'FM'
    WHEN name = 'Moldova' THEN 'MD'
    WHEN name = 'Monaco' THEN 'MC'
    WHEN name = 'Mongolia' THEN 'MN'
    WHEN name = 'Montenegro' THEN 'ME'
    WHEN name = 'Morocco' THEN 'MA'
    WHEN name = 'Mozambique' THEN 'MZ'
    WHEN name = 'Myanmar' THEN 'MM'
    WHEN name = 'Namibia' THEN 'NA'
    WHEN name = 'Nauru' THEN 'NR'
    WHEN name = 'Nepal' THEN 'NP'
    WHEN name = 'Netherlands' THEN 'NL'
    WHEN name = 'New Zealand' THEN 'NZ'
    WHEN name = 'Nicaragua' THEN 'NI'
    WHEN name = 'Niger' THEN 'NE'
    WHEN name = 'Nigeria' THEN 'NG'
    WHEN name = 'North Korea' THEN 'KP'
    WHEN name = 'North Macedonia' THEN 'MK'
    WHEN name = 'Norway' THEN 'NO'
    WHEN name = 'Oman' THEN 'OM'
    WHEN name = 'Pakistan' THEN 'PK'
    WHEN name = 'Palau' THEN 'PW'
    WHEN name = 'Palestine' THEN 'PS'
    WHEN name = 'Panama' THEN 'PA'
    WHEN name = 'Papua New Guinea' THEN 'PG'
    WHEN name = 'Paraguay' THEN 'PY'
    WHEN name = 'Peru' THEN 'PE'
    WHEN name = 'Philippines' THEN 'PH'
    WHEN name = 'Poland' THEN 'PL'
    WHEN name = 'Portugal' THEN 'PT'
    WHEN name = 'Qatar' THEN 'QA'
    WHEN name = 'Romania' THEN 'RO'
    WHEN name = 'Russia' THEN 'RU'
    WHEN name = 'Rwanda' THEN 'RW'
    WHEN name = 'Saint Kitts and Nevis' THEN 'KN'
    WHEN name = 'Saint Lucia' THEN 'LC'
    WHEN name = 'Saint Vincent and the Grenadines' THEN 'VC'
    WHEN name = 'Samoa' THEN 'WS'
    WHEN name = 'San Marino' THEN 'SM'
    WHEN name = 'Sao Tome and Principe' THEN 'ST'
    WHEN name = 'Saudi Arabia' THEN 'SA'
    WHEN name = 'Senegal' THEN 'SN'
    WHEN name = 'Serbia' THEN 'RS'
    WHEN name = 'Seychelles' THEN 'SC'
    WHEN name = 'Sierra Leone' THEN 'SL'
    WHEN name = 'Singapore' THEN 'SG'
    WHEN name = 'Slovakia' THEN 'SK'
    WHEN name = 'Slovenia' THEN 'SI'
    WHEN name = 'Solomon Islands' THEN 'SB'
    WHEN name = 'Somalia' THEN 'SO'
    WHEN name = 'South Africa' THEN 'ZA'
    WHEN name = 'South Korea' THEN 'KR'
    WHEN name = 'South Sudan' THEN 'SS'
    WHEN name = 'Spain' THEN 'ES'
    WHEN name = 'Sri Lanka' THEN 'LK'
    WHEN name = 'Sudan' THEN 'SD'
    WHEN name = 'Suriname' THEN 'SR'
    WHEN name = 'Sweden' THEN 'SE'
    WHEN name = 'Switzerland' THEN 'CH'
    WHEN name = 'Syria' THEN 'SY'
    WHEN name = 'Taiwan' THEN 'TW'
    WHEN name = 'Tajikistan' THEN 'TJ'
    WHEN name = 'Tanzania' THEN 'TZ'
    WHEN name = 'Thailand' THEN 'TH'
    WHEN name = 'Timor-Leste' THEN 'TL'
    WHEN name = 'Togo' THEN 'TG'
    WHEN name = 'Tonga' THEN 'TO'
    WHEN name = 'Trinidad and Tobago' THEN 'TT'
    WHEN name = 'Tunisia' THEN 'TN'
    WHEN name = 'Turkey' THEN 'TR'
    WHEN name = 'Turkmenistan' THEN 'TM'
    WHEN name = 'Tuvalu' THEN 'TV'
    WHEN name = 'Uganda' THEN 'UG'
    WHEN name = 'Ukraine' THEN 'UA'
    WHEN name = 'United Arab Emirates' THEN 'AE'
    WHEN name = 'United Kingdom' THEN 'GB'
    WHEN name = 'United States' THEN 'US'
    WHEN name = 'Uruguay' THEN 'UY'
    WHEN name = 'Uzbekistan' THEN 'UZ'
    WHEN name = 'Vanuatu' THEN 'VU'
    WHEN name = 'Vatican City' THEN 'VA'
    WHEN name = 'Venezuela' THEN 'VE'
    WHEN name = 'Vietnam' THEN 'VN'
    WHEN name = 'Yemen' THEN 'YE'
    WHEN name = 'Zambia' THEN 'ZM'
    WHEN name = 'Zimbabwe' THEN 'ZW'
    ELSE code
END
WHERE code IS NULL;

-- Set code column NOT NULL
ALTER TABLE public.countries 
    ALTER COLUMN code SET NOT NULL;

-- Add unique constraint only if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'countries_code_key'
    ) THEN
        ALTER TABLE public.countries ADD CONSTRAINT countries_code_key UNIQUE (code);
    END IF;
END $$;

-- Insert any missing countries
INSERT INTO public.countries (name, code)
SELECT name, code
FROM (VALUES 
    ('Afghanistan', 'AF'),
    ('Albania', 'AL'),
    ('Algeria', 'DZ'),
    ('Andorra', 'AD'),
    ('Angola', 'AO'),
    ('Antigua and Barbuda', 'AG'),
    ('Argentina', 'AR'),
    ('Armenia', 'AM'),
    ('Australia', 'AU'),
    ('Austria', 'AT'),
    ('Azerbaijan', 'AZ'),
    ('Bahamas', 'BS'),
    ('Bahrain', 'BH'),
    ('Bangladesh', 'BD'),
    ('Barbados', 'BB'),
    ('Belarus', 'BY'),
    ('Belgium', 'BE'),
    ('Belize', 'BZ'),
    ('Benin', 'BJ'),
    ('Bhutan', 'BT'),
    ('Bolivia', 'BO'),
    ('Bosnia and Herzegovina', 'BA'),
    ('Botswana', 'BW'),
    ('Brazil', 'BR'),
    ('Brunei', 'BN'),
    ('Bulgaria', 'BG'),
    ('Burkina Faso', 'BF'),
    ('Burundi', 'BI'),
    ('Cabo Verde', 'CV'),
    ('Cambodia', 'KH'),
    ('Cameroon', 'CM'),
    ('Canada', 'CA'),
    ('Central African Republic', 'CF'),
    ('Chad', 'TD'),
    ('Chile', 'CL'),
    ('China', 'CN'),
    ('Colombia', 'CO'),
    ('Comoros', 'KM'),
    ('Congo', 'CG'),
    ('Costa Rica', 'CR'),
    ('Croatia', 'HR'),
    ('Cuba', 'CU'),
    ('Cyprus', 'CY'),
    ('Czech Republic', 'CZ'),
    ('Denmark', 'DK'),
    ('Djibouti', 'DJ'),
    ('Dominica', 'DM'),
    ('Dominican Republic', 'DO'),
    ('Ecuador', 'EC'),
    ('Egypt', 'EG'),
    ('El Salvador', 'SV'),
    ('Equatorial Guinea', 'GQ'),
    ('Eritrea', 'ER'),
    ('Estonia', 'EE'),
    ('Eswatini', 'SZ'),
    ('Ethiopia', 'ET'),
    ('Fiji', 'FJ'),
    ('Finland', 'FI'),
    ('France', 'FR'),
    ('Gabon', 'GA'),
    ('Gambia', 'GM'),
    ('Georgia', 'GE'),
    ('Germany', 'DE'),
    ('Ghana', 'GH'),
    ('Greece', 'GR'),
    ('Grenada', 'GD'),
    ('Guatemala', 'GT'),
    ('Guinea', 'GN'),
    ('Guinea-Bissau', 'GW'),
    ('Guyana', 'GY'),
    ('Haiti', 'HT'),
    ('Honduras', 'HN'),
    ('Hungary', 'HU'),
    ('Iceland', 'IS'),
    ('India', 'IN'),
    ('Indonesia', 'ID'),
    ('Iran', 'IR'),
    ('Iraq', 'IQ'),
    ('Ireland', 'IE'),
    ('Israel', 'IL'),
    ('Italy', 'IT'),
    ('Jamaica', 'JM'),
    ('Japan', 'JP'),
    ('Jordan', 'JO'),
    ('Kazakhstan', 'KZ'),
    ('Kenya', 'KE'),
    ('Kiribati', 'KI'),
    ('Kuwait', 'KW'),
    ('Kyrgyzstan', 'KG'),
    ('Laos', 'LA'),
    ('Latvia', 'LV'),
    ('Lebanon', 'LB'),
    ('Lesotho', 'LS'),
    ('Liberia', 'LR'),
    ('Libya', 'LY'),
    ('Liechtenstein', 'LI'),
    ('Lithuania', 'LT'),
    ('Luxembourg', 'LU'),
    ('Madagascar', 'MG'),
    ('Malawi', 'MW'),
    ('Malaysia', 'MY'),
    ('Maldives', 'MV'),
    ('Mali', 'ML'),
    ('Malta', 'MT'),
    ('Marshall Islands', 'MH'),
    ('Mauritania', 'MR'),
    ('Mauritius', 'MU'),
    ('Mexico', 'MX'),
    ('Micronesia', 'FM'),
    ('Moldova', 'MD'),
    ('Monaco', 'MC'),
    ('Mongolia', 'MN'),
    ('Montenegro', 'ME'),
    ('Morocco', 'MA'),
    ('Mozambique', 'MZ'),
    ('Myanmar', 'MM'),
    ('Namibia', 'NA'),
    ('Nauru', 'NR'),
    ('Nepal', 'NP'),
    ('Netherlands', 'NL'),
    ('New Zealand', 'NZ'),
    ('Nicaragua', 'NI'),
    ('Niger', 'NE'),
    ('Nigeria', 'NG'),
    ('North Korea', 'KP'),
    ('North Macedonia', 'MK'),
    ('Norway', 'NO'),
    ('Oman', 'OM'),
    ('Pakistan', 'PK'),
    ('Palau', 'PW'),
    ('Palestine', 'PS'),
    ('Panama', 'PA'),
    ('Papua New Guinea', 'PG'),
    ('Paraguay', 'PY'),
    ('Peru', 'PE'),
    ('Philippines', 'PH'),
    ('Poland', 'PL'),
    ('Portugal', 'PT'),
    ('Qatar', 'QA'),
    ('Romania', 'RO'),
    ('Russia', 'RU'),
    ('Rwanda', 'RW'),
    ('Saint Kitts and Nevis', 'KN'),
    ('Saint Lucia', 'LC'),
    ('Saint Vincent and the Grenadines', 'VC'),
    ('Samoa', 'WS'),
    ('San Marino', 'SM'),
    ('Sao Tome and Principe', 'ST'),
    ('Saudi Arabia', 'SA'),
    ('Senegal', 'SN'),
    ('Serbia', 'RS'),
    ('Seychelles', 'SC'),
    ('Sierra Leone', 'SL'),
    ('Singapore', 'SG'),
    ('Slovakia', 'SK'),
    ('Slovenia', 'SI'),
    ('Solomon Islands', 'SB'),
    ('Somalia', 'SO'),
    ('South Africa', 'ZA'),
    ('South Korea', 'KR'),
    ('South Sudan', 'SS'),
    ('Spain', 'ES'),
    ('Sri Lanka', 'LK'),
    ('Sudan', 'SD'),
    ('Suriname', 'SR'),
    ('Sweden', 'SE'),
    ('Switzerland', 'CH'),
    ('Syria', 'SY'),
    ('Taiwan', 'TW'),
    ('Tajikistan', 'TJ'),
    ('Tanzania', 'TZ'),
    ('Thailand', 'TH'),
    ('Timor-Leste', 'TL'),
    ('Togo', 'TG'),
    ('Tonga', 'TO'),
    ('Trinidad and Tobago', 'TT'),
    ('Tunisia', 'TN'),
    ('Turkey', 'TR'),
    ('Turkmenistan', 'TM'),
    ('Tuvalu', 'TV'),
    ('Uganda', 'UG'),
    ('Ukraine', 'UA'),
    ('United Arab Emirates', 'AE'),
    ('United Kingdom', 'GB'),
    ('United States', 'US'),
    ('Uruguay', 'UY'),
    ('Uzbekistan', 'UZ'),
    ('Vanuatu', 'VU'),
    ('Vatican City', 'VA'),
    ('Venezuela', 'VE'),
    ('Vietnam', 'VN'),
    ('Yemen', 'YE'),
    ('Zambia', 'ZM'),
    ('Zimbabwe', 'ZW')
) AS new_countries(name, code)
WHERE NOT EXISTS (
    SELECT 1 FROM public.countries 
    WHERE countries.name = new_countries.name
)
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view countries"
    ON public.countries FOR SELECT
    USING (true); 