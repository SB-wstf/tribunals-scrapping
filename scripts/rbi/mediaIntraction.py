import schedule
import time,sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from pymongo import MongoClient


# MongoDB setup
client = MongoClient(sys.argv[1])
db = client['stale']
collection = db['rbi']

# Function to scrape PDFs for a given year
def scrape_media_interactions_for_year(driver):
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    pdf_links = []
    pdf_titles = []

    for link in soup.find_all('a', class_='link2', href=True):
        title = link.text.strip().replace('  ', ' ')
        pdf_titles.append(title)
        
    for link in soup.find_all('a', href=True):
        if link['href'].endswith('.PDF') or link['href'].endswith('.pdf'):
            img = link.find('img', src=True)
            if img and 'pdf' in img['src'].lower():
                pdf_links.append(link['href'])
    
    all_pdf_links = []
    for link, title in zip(pdf_links, pdf_titles):
        all_pdf_links.append({
            'link': link,
            'title': title
        })
    
    return all_pdf_links

# Helper function to click on the archive button
def get_archive_button(driver):
    archive_button = driver.find_element(By.XPATH, '//*[@id="divArchiveMain"]')
    archive_button.click()
    time.sleep(2)

# Function to run the scraping task with proper stopping based on existing documents
def run_scraping():
    driver = webdriver.Chrome()
    driver.maximize_window()

    url = 'https://www.rbi.org.in/Scripts/BS_ViewInterviews.aspx'
    driver.get(url)
    time.sleep(5)

    year_buttons = driver.find_elements(By.XPATH, "//div[contains(@id, 'btn') and contains(@class, 'year')]")
    year_ids = [button.get_attribute('id') for button in year_buttons]

    # Process only the desired year ids
    year_ids = year_ids[:21]
    for i in ['btn2007', 'btn2008']:
        year_ids.remove(i)

    archives = year_ids[11:]

    existing_count = 0  # To track how many existing documents are found
    MAX_EXISTING_COUNT = 3  # Stop after finding 3 existing documents

    for year_id in year_ids:
        if existing_count >= MAX_EXISTING_COUNT:
            print("Reached max existing count, stopping scraper.")
            break

        if year_id in archives:
            get_archive_button(driver)
        
        year_button = driver.find_element(By.ID, year_id)
        year_button.click()
        time.sleep(2)

        all_months_button_id = year_id[3:] + '0'
        all_months_button = driver.find_element(By.XPATH, f'//*[@id="{all_months_button_id}"]')
        all_months_button.click()
        time.sleep(3)

        get_archive_button(driver)

        # Scrape PDF links for the current year
        pdf_links = scrape_media_interactions_for_year(driver)
        
        # Process and insert documents into MongoDB one by one
        for item in pdf_links:
            document = {
                'tagString': 'Speeches and Media Interactions <-> Media Interactions',
                'title': item['title'],
                'pdfUrls': [item['link']]
            }
            
            # Check if document already exists
            existing_doc = collection.find_one({'title': item['title']})
            
            if existing_doc:
                # Increment count if the document already exists
                existing_count += 1
                print(f"Document already exists: {item['title']} (Existing count: {existing_count})")
                if existing_count >= MAX_EXISTING_COUNT:
                    print("Max existing documents found, stopping.")
                    driver.quit()
                    return  # Stop processing if existing_count reaches 3
            else:
                # Insert new document into MongoDB
                try:
                    collection.insert_one(document)
                    print(f"Inserted new document: {document['title']}")
                except Exception as e:
                    print(f"Error inserting document: {e}")
    
    driver.quit()


