import sys
import loader
import indexer
import retriever

def main():
    # This keeps track of which document we are currently talking to
    active_doc_id = None

    while True:
        current = active_doc_id if active_doc_id else "None"
        print(f"\n" + "="*30)
        print(f" ACTIVE DOCUMENT: {current}")
        print("="*30)
        print("1. Add/Ingest PDF")
        print("2. Change/Select Document")
        print("3. Ask a Question")
        print("4. Exit")
        
        choice = input("\nSelect (1-4): ")

        if choice == "1":
            path = input("Enter path to PDF: ").strip('"').strip("'")
            try:
                # Flow: Load -> Split -> Embed -> Save
                chunks, doc_id = loader.process_pdf(path)
                active_doc_id = indexer.create_index(chunks, doc_id)
                print(f"\n[+] '{doc_id}' is now active!")
            except Exception as e:
                print(f"Error: {e}")

        elif choice == "2":
            idx_list = retriever.list_indexes()
            if not idx_list:
                print("\n[!] No documents found. Use Option 1 to add one.")
                continue
            
            print("\nSaved Documents:")
            for i, name in enumerate(idx_list):
                print(f"[{i}] {name}")
            
            try:
                sel_input = input("\nIndex number (or 'b' to go back): ")
                if sel_input.lower() == 'b': continue
                
                sel = int(sel_input)
                if 0 <= sel < len(idx_list):
                    active_doc_id = idx_list[sel]
                    # This triggers the cache in retriever.py
                    retriever.load_db(active_doc_id)
                    print(f"\n[+] Switched to '{active_doc_id}'")
                else:
                    print("[!] Invalid number.")
            except ValueError:
                print("[!] Please enter a number.")

        elif choice == "3":
            if not active_doc_id:
                print("\n[!] Please select a document first (Option 1 or 2).")
                continue
            
            query = input("\nAsk Question (or 'b' for menu): ")
            if query.lower() == 'b': continue
            
            try:
                answer, sources = retriever.ask_question(query, active_doc_id)
                
                # --- NEW: Show Retrieved Chunks ---
                print("\n" + "."*20 + " RETRIEVED CHUNKS " + "."*20)
                for i, doc in enumerate(sources):
                    print(f"\n[Chunk {i+1} | Page {doc.metadata.get('page', 0)+1}]:")
                    print(f"{doc.page_content[:200]}...") # Show first 200 chars
                print("."*48)
                
                print("\n" + "-"*20 + " AI RESPONSE " + "-"*20)
                print(f"{answer}")
                print("-"*(40 + 13))
                
                pages = sorted(list(set([s.metadata.get('page', 0)+1 for s in sources])))
                print(f"Final Sources: Page(s) {', '.join(map(str, pages))}")
            except Exception as e:
                print(f"[!] Error during query: {e}")

        elif choice == "4":
            print("Goodbye!")
            sys.exit()

if __name__ == "__main__":
    main()
